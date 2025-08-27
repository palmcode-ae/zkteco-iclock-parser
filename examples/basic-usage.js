const { ZKTecoiClockParser, VerifyType, InOutMode } = require("../dist/index");

const sampleData =
	"11\t2025-08-27 10:57:49\t0\t25\t0\t0\t0\t0\t0\t0\n11\t2025-08-27 10:58:58\t1\t1\t0\t0\t0\t0\t0\t0";

console.log("🚀 ZKTeco iClock Parser Example\n");

const result = ZKTecoiClockParser.parseAttendanceLog(sampleData);

if (result.success && result.data) {
	console.log(`✅ Successfully parsed ${result.data.length} records:\n`);

	result.data.forEach((log, index) => {
		console.log(`📋 Record ${index + 1}:`);
		console.log(`   ${ZKTecoiClockParser.formatAttendanceLog(log)}`);

		if (ZKTecoiClockParser.isCheckIn(log)) {
			console.log("   ✅ CHECK-IN Event");
		} else if (ZKTecoiClockParser.isCheckOut(log)) {
			console.log("   ❌ CHECK-OUT Event");
		}

		console.log(
			`   🔐 Verification: ${ZKTecoiClockParser.getVerifyTypeName(log.verifyType)}`,
		);
		console.log();
	});

	if (result.warnings) {
		console.log(`⚠️  Warnings: ${result.warnings.join(", ")}`);
	}
} else {
	console.log(`❌ Parse failed: ${result.error}`);
}

const queryParams = {
	SN: "MED7241100320",
	INFO: "ZMM720-NF-Ver1.2.7,11,3,7094,192.168.1.14,10,12,12,10,111,0,10,0",
};

const deviceResult = ZKTecoiClockParser.parseDeviceInfo(queryParams);

if (deviceResult.success && deviceResult.data) {
	console.log("📱 Device Information:");
	console.log(`   Serial: ${deviceResult.data.serialNumber}`);
	console.log(`   Model: ${deviceResult.data.model}`);
	console.log(`   IP: ${deviceResult.data.deviceIP}`);
	console.log(`   Users: ${deviceResult.data.userCount}`);
	console.log(`   Records: ${deviceResult.data.recordCount}`);
}
