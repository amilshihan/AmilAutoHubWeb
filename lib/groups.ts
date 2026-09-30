import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryRow = { id: string; name: string; parent_id: string | null };

// Resolves a "/"-separated group path (e.g. "Products/Oil/Castrol") to the id
// of its leaf category, creating any missing segments along the way.
// `working` is mutated in place so repeated calls within one batch reuse
// groups created earlier in the same batch.
export async function resolveOrCreateGroupPath(
  supabase: SupabaseClient,
  working: CategoryRow[],
  fullPath: string
): Promise<{ id: string | null; error?: string }> {
  const segments = fullPath
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return { id: null };

  let parentId: string | null = null;
  let leafId: string | null = null;

  for (const segment of segments) {
    const existing = working.find((c) => c.name === segment && (c.parent_id ?? null) === parentId);
    if (existing) {
      parentId = existing.id;
      leafId = existing.id;
      continue;
    }
    const { data, error }: { data: CategoryRow | null; error: { message: string } | null } = await supabase
      .from("categories")
      .insert({ name: segment, parent_id: parentId })
      .select()
      .single();
    if (error || !data) {
      return { id: null, error: error?.message ?? "Could not create group." };
    }
    working.push(data);
    parentId = data.id;
    leafId = data.id;
  }
  return { id: leafId };
}

// Builds "Parent/Child" style full paths for every category, for autocomplete/display.
export function categoryPaths(categories: CategoryRow[]): Map<string, string> {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pathOf = (id: string): string => {
    const c = byId.get(id);
    if (!c) return "";
    return c.parent_id && byId.has(c.parent_id) ? `${pathOf(c.parent_id)}/${c.name}` : c.name;
  };
  return new Map(categories.map((c) => [c.id, pathOf(c.id)]));
}
