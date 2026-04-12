export interface CreateEventRequestDto {
  client: string;
  reason: string;
  startTime: string;
  endTime: string;
  comment?: string | null;
}

export interface EventResponseDto {
  id: number;
  client: string;
  reason: string;
  creationTime: string;
  startTime: string;
  endTime: string;
  status: string;
  warnings: Record<string, unknown>;
  comment: string | null;
  adminComment: string | null;
}
