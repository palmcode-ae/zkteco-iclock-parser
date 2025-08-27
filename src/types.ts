export interface AttendanceLog {
	userID: string;
	timestamp: Date;
	inOutMode: InOutMode;
	verifyType: VerifyType;
	workCode: WorkCode;
	deviceID?: number;
	reserved?: string[];
	raw?: string;
}

export interface DeviceInfo {
	serialNumber: string;
	model: string;
	userCount: number;
	fpCount: number;
	recordCount: number;
	deviceIP: string;
	adminCount: number;
	passwordCount: number;
	cardCount: number;
	faceCount: number;
	firmware?: string;
	platform?: string;
	fingerVer?: string;
	faceVer?: string;
	pushVer?: string;
}

export interface ParseResult<T> {
	success: boolean;
	data?: T;
	error?: string;
	warnings?: string[];
}

export enum VerifyType {
	UNKNOWN = 0,
	FINGERPRINT = 1,
	PASSWORD = 2,
	CARD = 3,
	FACE = 15,
	PALM = 25,
}

export enum InOutMode {
	CHECK_IN = 0,
	CHECK_OUT = 1,
	BREAK_OUT = 2,
	BREAK_IN = 3,
	OT_IN = 4,
	OT_OUT = 5,
}

export enum WorkCode {
	NORMAL = 0,
	OVERTIME = 1,
	HOLIDAY = 2,
	WEEKEND = 3,
}

export interface ParserOptions {
	strictMode?: boolean;
	includeRawData?: boolean;
	timestampFormat?: "auto" | "iso" | "custom";
}
