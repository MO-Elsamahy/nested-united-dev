// lib/features.ts

export interface AppFeatures {
    rentals: boolean;
    accounting: boolean;
    hr: boolean;
    crm: boolean;
}

// Fallback in case the fetch fails
const defaultFeatures: AppFeatures = {
    rentals: true,
    accounting: true,
    hr: true,
    crm: true,
};

export async function getAppFeatures(): Promise<AppFeatures> {
    try {
        // We use the NEXT_PUBLIC_MANIFEST_URL from .env
        const manifestUrl = process.env.NEXT_PUBLIC_MANIFEST_URL;

        if (!manifestUrl) {
            console.warn("No NEXT_PUBLIC_MANIFEST_URL provided, falling back to default features.");
            return defaultFeatures;
        }

        // Bypass GitHub's 5-minute CDN cache (Fastly) by appending a timestamp that changes every 60 seconds
        // This ensures GitHub gives us the fresh file, but Next.js Server Cache (revalidate 60) avoids spamming GitHub requests.
        const cacheBuster = Math.floor(Date.now() / 60000);
        const fetchUrl = manifestUrl.includes('?')
            ? `${manifestUrl}&t=${cacheBuster}`
            : `${manifestUrl}?t=${cacheBuster}`;

        // Fetch with a 60 seconds revalidate cache strategy (ISR pattern)
        const res = await fetch(fetchUrl, {
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            console.error("Failed to fetch features manifest, status:", res.status);
            return defaultFeatures;
        }

        const data: AppFeatures = await res.json();
        return { ...defaultFeatures, ...data }; // Merge with defaults to ensure all keys exist
    } catch (error) {
        console.error("Error fetching features manifest:", error);
        return defaultFeatures;
    }
}
