import { describe, expect, it } from "bun:test";
import { InOutMode, VerifyType, ZKTecoiClockParser } from "../src/index";

describe("ZKTeco iClock Parser", () => {
	it("parses a single attendance record", () => {
		const data = "11\t2025-08-27 10:57:49\t0\t25\t0\t0\t0\t0\t0\t0";
		const result = ZKTecoiClockParser.parseAttendanceLog(data);

		expect(result.success).toBeTrue();
		expect(result.data?.length).toBe(1);
		expect(result.data?.[0]?.userID).toBe("11");
		expect(result.data?.[0]?.verifyType).toBe(VerifyType.PALM);
		expect(result.data?.[0]?.inOutMode).toBe(InOutMode.CHECK_IN);
	});

	it("parses device info", () => {
		const query = {
			SN: "MED7241100320",
			INFO: "ZMM720-NF-Ver1.2.7,11,3,7094,192.168.1.14,10,12,12,10",
		} as Record<string, string>;

		const result = ZKTecoiClockParser.parseDeviceInfo(query);

		expect(result.success).toBeTrue();
		expect(result.data?.serialNumber).toBe("MED7241100320");
		expect(result.data?.model).toBe("ZMM720-NF-Ver1.2.7");
		expect(result.data?.userCount).toBe(11);
	});

	it("handles invalid data gracefully", () => {
		const result = ZKTecoiClockParser.parseAttendanceLog("invalid\tdata");
		expect(result.success).toBeTrue();
		expect(result.warnings).toBeDefined();
	});
});
