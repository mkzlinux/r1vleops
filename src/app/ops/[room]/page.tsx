"use client";

import { notFound, useParams } from "next/navigation";
import { Suspense } from "react";
import { RoomView, isRoomId } from "@/components/ops/RoomView";

function Room() {
  const { room } = useParams<{ room: string }>();
  if (!isRoomId(room)) notFound();
  return <RoomView key={room} room={room} />;
}

export default function OpsRoomPage() {
  return <Suspense fallback={null}><Room /></Suspense>;
}
