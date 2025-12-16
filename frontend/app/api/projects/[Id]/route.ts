import { NextRequest, NextResponse } from "next/server";

type Params = {
  id: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // TODO: Replace this with real DB logic
    console.log(`[save] Project ${id}`, body);

    // Simulate async DB save
    await new Promise((resolve) => setTimeout(resolve, 300));

    return NextResponse.json({
      success: true,
      projectId: id,
    });
  } catch (error) {
    console.error("[save] Error:", error);

    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 }
    );
  }
}
