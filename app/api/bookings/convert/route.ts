import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, queryOne } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// POST: Convert iCal reservation to manual booking
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { reservation_id } = await request.json();

        if (!reservation_id) {
            return NextResponse.json({ error: "reservation_id required" }, { status: 400 });
        }

        // Get the reservation
        const reservation = await queryOne<any>(
            "SELECT * FROM reservations WHERE id = ?",
            [reservation_id]
        );

        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        // Create a new booking with the reservation data
        const bookingId = uuidv4();
        await execute(
            `INSERT INTO bookings 
            (id, unit_id, guest_name, checkin_date, checkout_date, notes, platform) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                bookingId,
                reservation.unit_id,
                reservation.summary || "Guest",
                reservation.start_date,
                reservation.end_date,
                `تم التحويل من iCal - ${reservation.summary || 'Reserved'}`,
                "manual"
            ]
        );

        // Delete the original reservation so it doesn't sync again from iCal
        await execute("DELETE FROM reservations WHERE id = ?", [reservation_id]);

        return NextResponse.json({ success: true, booking_id: bookingId });
    } catch (error: any) {
        console.error("Error converting reservation:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
