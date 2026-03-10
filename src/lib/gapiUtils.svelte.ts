import { loadScript } from "./loadScript";
import type { BoardSaveData, FileInfo } from "./types";


const RootPath = "TasksData";
const BoardsPath = `${RootPath}/Boards`;

const DefaultBoardData: BoardSaveData = {
	board: {
		id: "none",
		title: "Untitled",
		description: "New board"
	},
	statuses: [],
	cards: []
};


class gapiHelper
{
	tokenClient: any = $state();
	authKey = $state("");
	isLoading = $state(false);
	loaded = $state(false);
	authenticated = $state(false);
	isSaving = $state(false);


	async init()
	{
		if (this.loaded || this.isLoading)
		{
			return;
		}
		
		this.isLoading = true;

		// load and wait for google APIs
		await loadScript("https://apis.google.com/js/api.js");
		await loadScript("https://accounts.google.com/gsi/client");

		// see if we can auto-init with our saved key
		let key = localStorage.getItem("apiKey");
		if (key)
		{
			this.authKey = key;
			gapi.load('client', this.initializeGapiClient.bind(this));
		}
		else
		{
			this.isLoading = false;
			this.loaded = true;
		}
	}

	async initializeGapiClient()
	{
		await gapi.client.init({
			apiKey: this.authKey
		});

		const localThis = this;

		const existingToken = localStorage.getItem("authToken");
		if (existingToken)
		{
			try
			{
				await gapi.client.setToken(JSON.parse(existingToken));
				localThis.authenticated = true;
			}
			catch
			{
				// token is probably expired or otherwise invalid, so we're not authenticated yet
			}
		}
		
		// google is loaded dynamically, and attempts to include the client library resulted in failures,
		// so disabling the error for now as it is an offline only issue.
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		this.tokenClient = google.accounts.oauth2.initTokenClient({
			client_id: "925108642688-72nga6gjh8h01fbbd6uj00jlje778en1.apps.googleusercontent.com",
			scope: "https://www.googleapis.com/auth/drive.file",
			callback: async (resp: any) => {
				if (resp.error !== undefined) {
					alert(`Failed to authenticate: ${resp}`);
					throw(resp);
				}

				localThis.authenticated = true;
				localStorage.setItem("authToken", JSON.stringify(resp));
			}
		});

		this.loaded = true;
		this.isLoading = false;
	}

	// Loads a file from the given event / input and uses the content as the apiKey to init gapi with.
	// Stores the key in local storage so future loads of the page don't need to explicitly provide the file.
	// This is simply a way to not store apiKey in source control, it's not intended to be robust security.
	initWithAuthKeyFile(event: Event)
	{
		let target = <HTMLInputElement>event.target;
		if (!target || !target.files || target.files.length == 0)
		{
			return;
		}

		let file = target.files[0];
		const localThis = this;
		const reader = new FileReader();
		reader.onload = function() {
			if (reader.result)
			{
				localThis.authKey = reader.result.toString();
				localStorage.setItem("apiKey", localThis.authKey);
				gapi.load('client', localThis.initializeGapiClient.bind(localThis));
			}
		}
		reader.readAsText(file);
	}

	// Clear locally cached apiKey - allows registering of a new one
	removeAPIKey()
	{
		localStorage.removeItem("apiKey");
		this.authKey = "";
	}

	// Basic login wrapper for gapi, avoiding constent screen for expired tokens
	doLogin()
	{
		if (gapi.client.getToken() === null)
		{
			// Prompt the user to select a Google Account and ask for consent to share their data
			// when establishing a new session.
			this.tokenClient.requestAccessToken({prompt: 'consent'});
		}
		else
		{
			// Skip display of account chooser and consent dialog for an existing session.
			this.tokenClient.requestAccessToken({prompt: ''});
		}
	};

	// Wrapper for gapi.client.request.
	// Typically when this fails it'll be due to login expiring, so catch certain errors and
	//  automatically request login again in that case.
	// Doesn't prevent the error on the initial request (null return), but does make the 
	//  flow recoverable without need to reload the page.
	async gapiRequest(req: gapi.client.RequestOptions)
	{
		try
		{
			let response = await gapi.client.request(req);
			return response;
		}
		catch (e: any)
		{
			if (e.status && (e.status == 404 || e.status == 401))
			{
				// these can be due to authentication issues, so try to login again
				this.doLogin();
			}
		}

		return null;
	}

	// Helper to get the gdrive folder ID of a folder at a given path, optionally creating the hierarchy if needed.
	// Returns the folder ID if found, otherwise null
	async requestFolderId(path: string, create: boolean = false)
	{
		let paths = path.split('/');
		let parent = 'root';

		// for each item in the path, attempt to find a folder in the parent with this name
		for (let i = 0; i < paths.length; ++i)
		{
			let current = paths[i];

			// make sure we only look for folders which aren't in the trash
			let query = `'${parent}' in parents and name = '${current}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
			let response = await this.gapiRequest({
				'path': `/drive/v3/files?q=${encodeURI(query)}`,
				'method': 'GET'
			});
			
			if (!response)
			{
				return null;
			}

			let resData = JSON.parse(response.body);
			
			if (!resData.files || resData.files.length == 0)
			{
				// no folder at this path - create if we've been asked to
				if (create)
				{
					let metadata = {
						"name": current,
						"parents": [ parent ],
						"mimeType": 'application/vnd.google-apps.folder'
					};
					let dataStr = JSON.stringify(metadata);

					let response = await this.gapiRequest({
						'path': '/drive/v3/files',
						'method': 'POST',
						'body': dataStr,
						'headers': {
							'content-type': "application/json",
							'content-length': dataStr.length
						}
					});

					if (!response)
					{
						return null;
					}

					// try again as we should be able to get a folder ID now
					--i;
					continue;
				}

				return null;
			}

			// we have a valid folder, so bump parent to this and do the next iteration
			parent = resData.files[0].id;
		}

		// success
		return parent;
	}

	// Helper to get the gdrive file ID of the file at the given path
	async requestFileId(path: string)
	{
		let parts = path.split('/');
		let folderPath = parts.slice(0, -1).join('/');
		let filename = parts[parts.length - 1];

		let parentId = await this.requestFolderId(folderPath);
		if (!parentId)
		{
			return null;
		}

		let query = `'${parentId}' in parents and name = '${filename}'`;
		let response = await this.gapiRequest({
			'path': `/drive/v3/files`,
			'params': {
				'q': query
			},
			'method': 'GET'
		});

		if (!response)
		{
			return null;
		}

		let resData = JSON.parse(response.body);

		if (!resData.files || resData.files.length == 0)
		{
			return null;
		}

		return resData.files[0].id;
	}

	async requestAllFoldersInPath(folderPath: string)
	{
		let parentId = await this.requestFolderId(folderPath);
		if (!parentId)
		{
			return null;
		}

		let query = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
		let response = await this.gapiRequest({
			'path': `/drive/v3/files`,
			'params': {
				'q': query
			},
			'method': 'GET'
		});

		if (!response)
		{
			return null;
		}

		let resData = JSON.parse(response.body);

		if (!resData.files || resData.files.length == 0)
		{
			return null;
		}

		return resData.files.map((f: any) => { return {id: f.id, name: f.name}; });
	}

	async requestFileContent(path: string)
	{
		let fileId = await this.requestFileId(path);
		if (!fileId)
		{
			return null;
		}

		let response = await this.gapiRequest({
			'path': `/drive/v3/files/${fileId}`,
			'params': {
				'alt': 'media'
			},
			'method': 'GET'
		});

		if (!response)
		{
			return null;
		}

		return response.body;
	}

	// Generic wrapper function for uploading an arbitrary file (buffer data) to a given path.
	// Optionally provided folderId simply speeds up the process by not needing to get the folder ID each time.
	// Returns the gdrive file ID of the uploaded file.
	async uploadFile(path: string, folderId: string | null, buffer: Uint8Array<ArrayBuffer>, force: boolean = false)
	{
		// check if we can upload
		let existingFileId = null;
		
		existingFileId = await this.requestFileId(path);
		if (!force && existingFileId)
		{
			// already have a file ID for this path, so do nothing
			return existingFileId;
		}

		// get destination folder ID as needed
		let comps = path.split('/');
		let name = comps[comps.length - 1];

		if (!folderId)
		{
			let folderPath = comps.slice(0, -1).join('/');
			folderId = await this.requestFolderId(folderPath, true);
		}

		if (existingFileId)
		{
			// upload new data only
			let response = await this.gapiRequest({
				'path': `/upload/drive/v3/files/${existingFileId}?uploadType=media`,
				'method': 'PATCH',
				'body': buffer,
				'headers': {
					'content-type': "application/octet-stream",
					'content-length': buffer.byteLength.toString(),
				}
			});
			
			if (!response || !response.headers)
			{
				return null;
			}
		}
		else
		{
			// uploading a new file
			// upload as resumable to provide metadata and support for larger files
			let metadata = {
				"name": name,
				"parents": [ folderId ]
			};
			let dataStr = JSON.stringify(metadata);
	
			// request upload information
			let response = await this.gapiRequest({
				'path': '/upload/drive/v3/files?uploadType=resumable',
				'method': 'POST',
				'body': dataStr,
				'headers': {
					'content-type': "application/json",
					'content-length': dataStr.length,
					'x-upload-content-length': buffer.byteLength
				}
			});
			
			if (!response || !response.headers)
			{
				return null;
			}
	
			// this copy of the data silences typescript errors since the API says the headers object is an array...
			let headers = JSON.parse(JSON.stringify(response.headers));
	
			// extract the upload URL we send the data to
			let uploadURL = headers["location"];
	
			try
			{
				// upload the actual file data now.
				// this will fail in localhost because of CORS, so for now catch the error and move on
				// - the request to get the file ID below will kind of validate this anyway... kind of
				let response = await fetch(uploadURL, {
					'method': 'PUT',
					'body': buffer,
					'headers': {
						'content-length': buffer.byteLength.toString()
					}
				});
	
				if (!response || !response.ok)
				{
					// most likely caused by authentication error, so we'll attempt login again
					this.doLogin();
					return null;
				}
			}
			catch
			{}
		}


		// finally grab the file ID of the newly created file, and validate it is available
		existingFileId = await this.requestFileId(path);

		return existingFileId;
	}

	// Generic wrapper function for uploading a json object to a given path.
	// uploadFile should technically be able to do this, but API silliness means this is the path of least resistance.
	// Optionally provided folderId simply speeds up the process by not needing to get the folder ID each time.
	// Returns the gdrive file ID of the uploaded file.
	async uploadJsonObject(path: string, folderId: string | null, obj: object, force: boolean = false)
	{
		// check if we can upload
		let existingFileId = null;
		
		existingFileId = await this.requestFileId(path);
		if (!force && existingFileId)
		{
			// already have a file ID for this path, so do nothing
			return existingFileId;
		}

		// get destination folder ID as needed
		let comps = path.split('/');
		let name = comps[comps.length - 1];

		if (!folderId)
		{
			let folderPath = comps.slice(0, -1).join('/');
			folderId = await this.requestFolderId(folderPath, true);
		}

		const objJson = JSON.stringify(obj);

		if (existingFileId)
		{
			// upload new data only
			let response = await this.gapiRequest({
				'path': `/upload/drive/v3/files/${existingFileId}?uploadType=media`,
				'method': 'PATCH',
				'body': objJson,
				'headers': {
					'content-type': "application/json",
					'content-length': objJson.length.toString(),
				}
			});
			
			if (!response || !response.headers)
			{
				return null;
			}
		}
		else
		{
			// uploading a new file
			// upload as resumable to provide metadata and support for larger files
			let metadata = {
				"name": name,
				"parents": [ folderId ]
			};
			let dataStr = JSON.stringify(metadata);
	
			// request upload information
			let response = await this.gapiRequest({
				'path': '/upload/drive/v3/files?uploadType=resumable',
				'method': 'POST',
				'body': dataStr,
				'headers': {
					'content-type': "application/json",
					'content-length': dataStr.length,
					'x-upload-content-length': objJson.length
				}
			});
			
			if (!response || !response.headers)
			{
				return null;
			}
	
			// this copy of the data silences typescript errors since the API says the headers object is an array...
			let headers = JSON.parse(JSON.stringify(response.headers));
	
			// extract the upload URL we send the data to
			let uploadURL = headers["location"];
	
			try
			{
				// upload the actual file data now.
				// this will fail in localhost because of CORS, so for now catch the error and move on
				// - the request to get the file ID below will kind of validate this anyway... kind of
				let response = await fetch(uploadURL, {
					'method': 'PUT',
					'body': objJson,
					'headers': {
						'content-type': "application/json",
						'content-length': objJson.length.toString()
					}
				});
	
				if (!response || !response.ok)
				{
					// most likely caused by authentication error, so we'll attempt login again
					this.doLogin();
					return null;
				}
			}
			catch
			{}
		}


		// finally grab the file ID of the newly created file, and validate it is available
		existingFileId = await this.requestFileId(path);

		return existingFileId;
	}



	async GetAllBoards()
	{
		return await this.requestAllFoldersInPath(BoardsPath);
	}

	async GetBoardData(id: string)
	{
		const boardPath = `${BoardsPath}/${id}/${id}.json`;
		const fileContents = await this.requestFileContent(boardPath);

		if (!fileContents)
		{
			return null;
		}

		return JSON.parse(fileContents);
	}

	async CreateBoard(name: string)
	{
		const boardId = name.replaceAll(' ', '');
		const boardPath = `${BoardsPath}/${boardId}`;

		// create the folder for the new board
		const boardFolderId = await this.requestFolderId(boardPath, true);

		if (!boardFolderId)
		{
			// failed to create the board folder
			return null;
		}

		// check we don't have a board already at this location
		const existingId = await this.requestFileId(`${boardPath}/${boardId}.json`);

		if (existingId)
		{
			// already have a board here
			return null;
		}

		// create our default data
		const data = <BoardSaveData>JSON.parse(JSON.stringify(DefaultBoardData));
		data.board.id = boardId;
		data.board.title = name;

		return await this.UploadBoardJson(data);
	}

	async UploadObjectAsJson(obj: object, path: string)
	{
		// prepare json upload
		// only do json upload if all good up to this point

		// do json upload
		return await this.uploadJsonObject(path, null, obj, true);
	}

	async UploadBoardJson(data: BoardSaveData)
	{
		if (this.isSaving)
		{
			// already saving, don't do another
			return;
		}

		this.isSaving = true;

		const fileId = await this.UploadObjectAsJson(data, `${BoardsPath}/${data.board.id}/${data.board.id}.json`);

		this.isSaving = false;

		return fileId;
	}
}

export const gapiUtils = new gapiHelper();