export interface FileInfo {
	id: string;
	name: string;
}

export interface StatusData {
	id: number;
	title: string;
}

export interface CardMinimalData {
	id: number;
	title: string;
	status: number;
}

export interface CardData {
	id: number;
	title: string;
	status: number;
	description: string;
}

export interface BoardData {
	id: string;
	title: string;
	description: string;
}

export interface BoardSaveData {
	board: BoardData;
	statuses: StatusData[];
	cards: CardMinimalData[];
}