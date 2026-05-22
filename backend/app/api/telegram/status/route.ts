import { NextResponse } from "next/server";
import { getTelegramTelemetry } from "../../../../lib/telegram/state";

const DEV_FRONTEND_ORIGIN = "http://localhost:3001";
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": DEV_FRONTEND_ORIGIN,
	"Access-Control-Allow-Methods": "GET,OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export async function GET() {
	console.log("[API] /api/telegram/status hit");

	try {
		const telemetry = getTelegramTelemetry();

		console.log("[API] Telegram telemetry read success", {
			lastCommand: telemetry.lastCommand,
			lastUser: telemetry.lastUser,
			totalMessages: telemetry.totalMessages
		});

		return NextResponse.json(
			{
				success: true,
				telemetry
			},
			{ headers: CORS_HEADERS }
		);
	} catch (error: any) {
		console.error(
			"[API] Telegram telemetry read failure",
			error?.message || error
		);
		return NextResponse.json(
			{
				success: false,
				error: error?.message || "Unknown error"
			},
			{ status: 500, headers: CORS_HEADERS }
		);
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: CORS_HEADERS
	});
}
