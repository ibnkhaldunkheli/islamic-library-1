import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://islamic-library-1-chi.vercel.app";

  const supabase = createClient();

  const { data: books } = await supabase
    .from("books")
    .select("id, created_at");

  const bookUrls: MetadataRoute.Sitemap =
    (books ?? []).map((book) => ({
      url: `${baseUrl}/books/${book.id}`,
      lastModified: new Date(book.created_at),
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/books`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ulama`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/audio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...bookUrls,
  ];
        }
