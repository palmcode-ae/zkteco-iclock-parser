import { ZKTecoiClockParser } from "../dist/index";

const PORT = 3010;
const hostname = "0.0.0.0";

Bun.serve({
	port: PORT,
	hostname,

	async fetch(req) {
		const url = new URL(req.url);
		const pathname = url.pathname;
		const query = Object.fromEntries(url.searchParams);

		if (pathname === "/iclock/cdata" && req.method === "POST") {
			const body = await req.text();
			const { SN, table } = query as Record<string, string>;

			if (table === "ATTLOG" && body) {
				const parseResult = ZKTecoiClockParser.parseAttendanceLog(body);

				if (parseResult.success && parseResult.data) {
					console.log(`📱 Device ${SN} - ${parseResult.data.length} records:`);

					for (const log of parseResult.data) {
						console.log(`   ${ZKTecoiClockParser.formatAttendanceLog(log)}`);
					}
				}
			}

			return new Response("OK", { status: 200 });
		}

		if (pathname === "/iclock/getrequest" && req.method === "GET") {
			const deviceResult = ZKTecoiClockParser.parseDeviceInfo(
				query as Record<string, string>,
			);

			if (deviceResult.success && deviceResult.data) {
				console.log(
					`🔄 Device ${deviceResult.data.serialNumber} requesting commands`,
				);
			}

			return new Response("OK", { status: 200 });
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.log(`🚀 ZKTeco Server listening on http://${hostname}:${PORT}`);
