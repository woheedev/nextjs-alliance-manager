import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { config } from "@/app/config";
import { hasAnyRequiredRole, hasMasterRole } from "@/app/lib/auth";
import type { User, UserData } from "@/app/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as UserData;
    const roles = decoded.roles;

    const user: User = {
      id: decoded.userId,
      username: decoded.username,
      roles,
      isMaster: hasMasterRole(roles),
      hasAccess: hasAnyRequiredRole(roles),
    };

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
