const apiUrl = process.env.NEXT_PUBLIC_API_URL!;

export async function api(path: string, options?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "API error");
  }

  return response.json();
}
