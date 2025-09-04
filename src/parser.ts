import type {
	AttendanceLog,
	DeviceInfo,
	ParseResult,
	ParserOptions,
} from "./types";
import { InOutMode, VerifyType, WorkCode } from "./types";

/* biome-ignore lint/complexity/noStaticOnlyClass: Namespaced API surface for better DX */
export class ZKTecoiClockParser {
	/**
	 * Human readable names for `VerifyType` values.
	 */
	private static readonly VERIFY_TYPE_NAMES: Record<VerifyType, string> = {
		[VerifyType.UNKNOWN]: "Unknown",
		[VerifyType.FINGERPRINT]: "Fingerprint",
		[VerifyType.PASSWORD]: "Password",
		[VerifyType.CARD]: "Card/RFID",
		[VerifyType.FACE]: "Face Recognition",
		[VerifyType.PALM]: "Palm Recognition",
	};

	/**
	 * Human readable names for `InOutMode` values.
	 */
	private static readonly IN_OUT_MODE_NAMES: Record<InOutMode, string> = {
		[InOutMode.CHECK_IN]: "Check In",
		[InOutMode.CHECK_OUT]: "Check Out",
		[InOutMode.BREAK_OUT]: "Break Out",
		[InOutMode.BREAK_IN]: "Break In",
		[InOutMode.OT_IN]: "Overtime In",
		[InOutMode.OT_OUT]: "Overtime Out",
	};

	/**
	 * Parse a timestamp string into a Date, treating it as device local time.
	 *
	 * @param timestampStr String timestamp from the device (e.g., "2025-09-04 16:14:09")
	 * @param timezoneOffset Timezone offset from UTC in hours (e.g., +4 for Dubai, -5 for EST)
	 * @returns Date instance or null when invalid
	 */
	private static parseTimestamp(
		timestampStr: string,
		timezoneOffset = 4,
	): Date | null {
		if (!timestampStr) return null;
		try {
			let clean = timestampStr.trim().replace(/\//g, "-");
			let date = new Date(clean);
			if (Number.isNaN(date.getTime())) {
				clean = clean.replace(" ", "T");
				date = new Date(clean);
				if (Number.isNaN(date.getTime())) return null;
			}
			const serverOffsetMin = date.getTimezoneOffset();
			const deviceOffsetMin = -timezoneOffset * 60;
			const offsetDifferenceMin = deviceOffsetMin - serverOffsetMin;
			return new Date(date.getTime() + offsetDifferenceMin * 60 * 1000);
		} catch {
			return null;
		}
	}

	/**
	 * Parse a raw verify type into `VerifyType` enum.
	 *
	 * @param value Raw string value (e.g. "25")
	 * @returns VerifyType enum or null when unknown/invalid
	 */
	private static parseVerifyType(value: string | undefined): VerifyType | null {
		if (!value) return null;
		const num = Number.parseInt(value, 10);
		if (Number.isNaN(num)) return null;
		return (Object.values(VerifyType) as Array<number>).includes(num)
			? (num as VerifyType)
			: null;
	}

	/**
	 * Parse a raw in/out mode into `InOutMode` enum.
	 *
	 * @param value Raw string value (e.g. "0")
	 * @returns InOutMode enum or null when unknown/invalid
	 */
	private static parseInOutMode(value: string | undefined): InOutMode | null {
		if (!value) return null;
		const num = Number.parseInt(value, 10);
		if (Number.isNaN(num)) return null;
		return (Object.values(InOutMode) as Array<number>).includes(num)
			? (num as InOutMode)
			: null;
	}

	/**
	 * Parse a work code or default to NORMAL when invalid.
	 *
	 * @param value Raw string value (e.g. "0")
	 * @returns WorkCode enum
	 */
	private static parseWorkCode(value: string): WorkCode {
		const num = Number.parseInt(value, 10);
		return Number.isNaN(num) ? WorkCode.NORMAL : (num as WorkCode);
	}

	/**
	 * Safe integer parsing helper.
	 *
	 * @param value Raw numeric string
	 * @returns Parsed number or undefined when invalid
	 */
	private static parseNumber(value: string): number | undefined {
		const num = Number.parseInt(value, 10);
		return Number.isNaN(num) ? undefined : num;
	}

	/**
	 * Parse a single ATTLOG row from ZKTeco iClock.
	 *
	 * Input is expected to be tab-separated fields.
	 *
	 * @param line The raw, single line of ATTLOG data
	 * @param lineNumber Optional line number (for error/warning context)
	 * @param options Parser options
	 * @returns ParseResult with a single AttendanceLog
	 *
	 * @example
	 * const row = "11\t2025-08-27 10:57:49\t0\t25\t0";
	 * const r = parseSingleAttendanceRecord(row);
	 * if (r.success) console.log(r.data!.userID);
	 */
	public static parseSingleAttendanceRecord(
		line: string,
		lineNumber?: number,
		options: ParserOptions = {},
	): ParseResult<AttendanceLog> {
		const parts = line.split("\t");
		const warnings: string[] = [];

		if (parts.length < 4) {
			return {
				success: false,
				error: `Insufficient fields (${parts.length}/4 minimum required)`,
			};
		}

		try {
			const userID = parts[0]?.trim();
			if (!userID) return { success: false, error: "Missing User ID" };

			const timestampStr = parts[1]?.trim();
			if (!timestampStr) return { success: false, error: "Missing timestamp" };

			const timestamp = ZKTecoiClockParser.parseTimestamp(
				timestampStr,
				options.timezoneOffset ?? 4,
			);
			if (!timestamp)
				return {
					success: false,
					error: `Invalid timestamp format: ${timestampStr}`,
				};

			const inOutModeRaw = parts[2]?.trim();
			const inOutMode = ZKTecoiClockParser.parseInOutMode(inOutModeRaw);
			if (inOutMode === null)
				warnings.push(`Unknown in/out mode: ${inOutModeRaw}, using CHECK_IN`);

			const verifyTypeRaw = parts[3]?.trim();
			const verifyType = ZKTecoiClockParser.parseVerifyType(verifyTypeRaw);
			if (verifyType === null)
				warnings.push(`Unknown verify type: ${verifyTypeRaw}, using UNKNOWN`);

			const workCode = parts[4]
				? ZKTecoiClockParser.parseWorkCode(parts[4].trim())
				: WorkCode.NORMAL;
			const deviceID = parts[5]
				? ZKTecoiClockParser.parseNumber(parts[5].trim())
				: undefined;
			const reserved = parts
				.slice(6)
				.map((p) => p.trim())
				.filter((p) => p.length > 0);

			const attendanceLog: AttendanceLog = {
				userID,
				timestamp,
				inOutMode: inOutMode ?? InOutMode.CHECK_IN,
				verifyType: verifyType ?? VerifyType.UNKNOWN,
				workCode,
				deviceID,
				reserved: reserved.length > 0 ? reserved : undefined,
				raw: options.includeRawData ? line : undefined,
			};

			return {
				success: true,
				data: attendanceLog,
				warnings: warnings.length > 0 ? warnings : undefined,
			};
		} catch (error) {
			return { success: false, error: `Parse error: ${error}` };
		}
	}

	/**
	 * Parse multi-line ATTLOG data into structured attendance logs.
	 *
	 * @param data Raw text body sent by device (tab-separated rows)
	 * @param options Parser options
	 * @returns ParseResult with list of AttendanceLog entries
	 *
	 * @example
	 * const body = `11\t2025-08-27 10:57:49\t0\t25\n11\t2025-08-27 10:58:58\t1\t1`;
	 * const result = ZKTecoiClockParser.parseAttendanceLog(body);
	 * if (result.success) result.data.forEach(log => console.log(log.userID));
	 */
	public static parseAttendanceLog(
		data: string,
		options: ParserOptions = {},
	): ParseResult<AttendanceLog[]> {
		if (!data || typeof data !== "string") {
			return { success: false, error: "Invalid or empty attendance data" };
		}

		const lines = data
			.trim()
			.split("\n")
			.filter((line) => line.trim());
		const attendances: AttendanceLog[] = [];
		const warnings: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const raw = lines[i];
			if (!raw) continue;
			const line = raw.trim();
			const lineNumber = i + 1;
			if (!line) continue;

			try {
				const result = ZKTecoiClockParser.parseSingleAttendanceRecord(
					line,
					lineNumber,
					options,
				);
				if (result.success && result.data) attendances.push(result.data);
				if (result.warnings) warnings.push(...result.warnings);
				if (result.error) {
					if (options.strictMode)
						return {
							success: false,
							error: `Line ${lineNumber}: ${result.error}`,
						};
					warnings.push(`Line ${lineNumber}: ${result.error}`);
				}
			} catch (error) {
				const errorMsg = `Line ${lineNumber}: Unexpected error - ${error}`;
				if (options.strictMode) return { success: false, error: errorMsg };
				warnings.push(errorMsg);
			}
		}

		return {
			success: true,
			data: attendances,
			warnings: warnings.length > 0 ? warnings : undefined,
		};
	}

	/**
	 * Parse device info from iClock getrequest query parameters.
	 *
	 * @param queryParams Key-value map from request query (must include SN)
	 * @returns ParseResult with DeviceInfo details
	 *
	 * @example
	 * const q = { SN: 'ABC123', INFO: 'ZMM,1,0,10,192.168.1.10,0,0,0,0' };
	 * const r = ZKTecoiClockParser.parseDeviceInfo(q);
	 */
	public static parseDeviceInfo(
		queryParams: Record<string, string>,
	): ParseResult<DeviceInfo> {
		if (!queryParams.SN) {
			return {
				success: false,
				error: "Missing device serial number (SN parameter)",
			};
		}

		const deviceInfo: DeviceInfo = {
			serialNumber: queryParams.SN,
			model: "",
			userCount: 0,
			fpCount: 0,
			recordCount: 0,
			deviceIP: "",
			adminCount: 0,
			passwordCount: 0,
			cardCount: 0,
			faceCount: 0,
		};

		if (queryParams.INFO) {
			try {
				const infoParts = queryParams.INFO.split(",");
				deviceInfo.model = infoParts[0] || "";
				deviceInfo.userCount = Number.parseInt(infoParts[1] || "0", 10) || 0;
				deviceInfo.fpCount = Number.parseInt(infoParts[2] || "0", 10) || 0;
				deviceInfo.recordCount = Number.parseInt(infoParts[3] || "0", 10) || 0;
				deviceInfo.deviceIP = infoParts[4] || "";
				deviceInfo.adminCount = Number.parseInt(infoParts[5] || "0", 10) || 0;
				deviceInfo.passwordCount =
					Number.parseInt(infoParts[6] || "0", 10) || 0;
				deviceInfo.cardCount = Number.parseInt(infoParts[7] || "0", 10) || 0;
				deviceInfo.faceCount = Number.parseInt(infoParts[8] || "0", 10) || 0;
				if (infoParts.length > 9) {
					deviceInfo.firmware = infoParts[9] || undefined;
					deviceInfo.platform = infoParts[10] || undefined;
					deviceInfo.fingerVer = infoParts[11] || undefined;
					deviceInfo.faceVer = infoParts[12] || undefined;
					deviceInfo.pushVer = infoParts[13] || undefined;
				}
			} catch (error) {
				return {
					success: false,
					error: `Failed to parse device info: ${error}`,
				};
			}
		}

		return { success: true, data: deviceInfo };
	}

	/**
	 * Get human-friendly name for a VerifyType.
	 * @param type VerifyType enum value
	 * @returns Name like "Palm Recognition"
	 */
	public static getVerifyTypeName(type: VerifyType): string {
		return ZKTecoiClockParser.VERIFY_TYPE_NAMES[type] || `Unknown (${type})`;
	}

	/**
	 * Get human-friendly name for an InOutMode.
	 * @param mode InOutMode enum value
	 * @returns Name like "Check In"
	 */
	public static getInOutModeName(mode: InOutMode): string {
		return ZKTecoiClockParser.IN_OUT_MODE_NAMES[mode] || `Unknown (${mode})`;
	}

	/**
	 * Pretty format an AttendanceLog for logs/console.
	 * @param log AttendanceLog entry
	 * @returns Formatted single-line string
	 *
	 * @example
	 * console.log(formatAttendanceLog(log));
	 */
	public static formatAttendanceLog(log: AttendanceLog): string {
		const direction =
			log.inOutMode === InOutMode.CHECK_IN
				? "→"
				: log.inOutMode === InOutMode.CHECK_OUT
					? "←"
					: log.inOutMode === InOutMode.BREAK_OUT
						? "⤴"
						: log.inOutMode === InOutMode.BREAK_IN
							? "⤵"
							: "⚡";

		return [
			`${direction} User ${log.userID}`,
			`📅 ${log.timestamp.toLocaleString()}`,
			`🔐 ${ZKTecoiClockParser.getVerifyTypeName(log.verifyType)}`,
			`📍 ${ZKTecoiClockParser.getInOutModeName(log.inOutMode)}`,
			log.deviceID ? `🖥️ Device ${log.deviceID}` : "",
		]
			.filter(Boolean)
			.join(" | ");
	}

	/**
	 * Whether an attendance log indicates a check-in event.
	 * @param log AttendanceLog entry
	 * @returns true if CHECK_IN/BREAK_IN/OT_IN
	 */
	public static isCheckIn(log: AttendanceLog): boolean {
		return (
			log.inOutMode === InOutMode.CHECK_IN ||
			log.inOutMode === InOutMode.BREAK_IN ||
			log.inOutMode === InOutMode.OT_IN
		);
	}

	/**
	 * Whether an attendance log indicates a check-out event.
	 * @param log AttendanceLog entry
	 * @returns true if CHECK_OUT/BREAK_OUT/OT_OUT
	 */
	public static isCheckOut(log: AttendanceLog): boolean {
		return (
			log.inOutMode === InOutMode.CHECK_OUT ||
			log.inOutMode === InOutMode.BREAK_OUT ||
			log.inOutMode === InOutMode.OT_OUT
		);
	}

	/**
	 * Validate structure and enum values of an AttendanceLog.
	 * @param log The attendance log to validate
	 * @returns ParseResult with the same log or an error
	 */
	public static validateAttendanceLog(
		log: AttendanceLog,
	): ParseResult<AttendanceLog> {
		const errors: string[] = [];
		if (!log.userID || log.userID.trim().length === 0)
			errors.push("User ID is required");
		if (!log.timestamp || Number.isNaN(log.timestamp.getTime()))
			errors.push("Valid timestamp is required");
		if (
			!(Object.values(VerifyType) as Array<number | string>).includes(
				log.verifyType,
			)
		)
			errors.push("Invalid verify type");
		if (
			!(Object.values(InOutMode) as Array<number | string>).includes(
				log.inOutMode,
			)
		)
			errors.push("Invalid in/out mode");
		if (errors.length > 0) return { success: false, error: errors.join(", ") };
		return { success: true, data: log };
	}
}
