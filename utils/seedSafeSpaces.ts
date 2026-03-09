import { supabase } from "@/lib/supabase";

interface SafeSpaceSeed {
    name: string;
    category: "Parks" | "Libraries" | "Quiet Cafés" | "Meditation Rooms" | "Campus Spaces";
    lat: number;
    lng: number;
    tags: string[];
    address: string;
}

const REAL_SAFE_SPACES: SafeSpaceSeed[] = [
    // ── New York City ───────────────────────────────────────────────
    { name: "Central Park Sheep Meadow", category: "Parks", lat: 40.7709, lng: -73.9774, tags: ["calm", "quiet", "safe"], address: "Central Park, New York, NY 10024" },
    { name: "Bryant Park", category: "Parks", lat: 40.7536, lng: -73.9832, tags: ["calm", "safe", "good for studying"], address: "Bryant Park, 42nd St, New York, NY 10018" },
    { name: "The High Line", category: "Parks", lat: 40.7480, lng: -74.0048, tags: ["calm", "quiet"], address: "The High Line, W 30th St, New York, NY 10001" },
    { name: "New York Public Library – Stephen A. Schwarzman", category: "Libraries", lat: 40.7532, lng: -73.9822, tags: ["quiet", "good for studying", "safe"], address: "476 5th Ave, New York, NY 10018" },
    { name: "Brooklyn Public Library – Grand Army Plaza", category: "Libraries", lat: 40.6723, lng: -73.9686, tags: ["good for studying", "quiet", "safe"], address: "10 Grand Army Plaza, Brooklyn, NY 11238" },
    { name: "Prospect Park – Long Meadow", category: "Parks", lat: 40.6602, lng: -73.9690, tags: ["calm", "quiet", "safe"], address: "Prospect Park, Brooklyn, NY 11215" },
    { name: "Gregorys Coffee – Midtown East", category: "Quiet Cafés", lat: 40.7513, lng: -73.9733, tags: ["quiet", "calm", "good for studying"], address: "874 3rd Ave, New York, NY 10022" },

    // ── Los Angeles ─────────────────────────────────────────────────
    { name: "Griffith Park Observatory Lawn", category: "Parks", lat: 34.1185, lng: -118.3004, tags: ["calm", "safe", "quiet"], address: "2800 E Observatory Rd, Los Angeles, CA 90027" },
    { name: "Santa Monica Public Library", category: "Libraries", lat: 34.0132, lng: -118.4912, tags: ["good for studying", "quiet", "safe"], address: "601 Santa Monica Blvd, Santa Monica, CA 90401" },
    { name: "Descanso Gardens", category: "Parks", lat: 34.2007, lng: -118.2036, tags: ["calm", "quiet", "safe"], address: "1418 Descanso Dr, La Cañada Flintridge, CA 91011" },
    { name: "The Last Bookstore – LA", category: "Quiet Cafés", lat: 34.0489, lng: -118.2510, tags: ["calm", "quiet", "good for studying"], address: "453 S Spring St, Los Angeles, CA 90013" },
    { name: "UCLA Royce Hall Lawn", category: "Campus Spaces", lat: 34.0732, lng: -118.4417, tags: ["calm", "good for studying", "safe"], address: "10745 Dickson Plaza, Los Angeles, CA 90095" },
    { name: "Exposition Park Rose Garden", category: "Parks", lat: 34.0160, lng: -118.2869, tags: ["calm", "quiet", "safe"], address: "701 State Dr, Los Angeles, CA 90037" },

    // ── Chicago ─────────────────────────────────────────────────────
    { name: "Chicago Public Library – Harold Washington", category: "Libraries", lat: 41.8760, lng: -87.6285, tags: ["quiet", "good for studying", "safe"], address: "400 S State St, Chicago, IL 60605" },
    { name: "Millennium Park – Lurie Garden", category: "Parks", lat: 41.8800, lng: -87.6240, tags: ["calm", "quiet", "safe"], address: "201 E Randolph St, Chicago, IL 60601" },
    { name: "Lincoln Park – South Pond", category: "Parks", lat: 41.9241, lng: -87.6374, tags: ["calm", "safe", "quiet"], address: "Lincoln Park, Chicago, IL 60614" },
    { name: "Intelligentsia Coffee – Wicker Park", category: "Quiet Cafés", lat: 41.9081, lng: -87.6785, tags: ["quiet", "calm", "good for studying"], address: "1850 W Division St, Chicago, IL 60622" },
    { name: "UChicago Regenstein Library", category: "Campus Spaces", lat: 41.7924, lng: -87.5995, tags: ["good for studying", "quiet", "safe"], address: "1100 E 57th St, Chicago, IL 60637" },

    // ── San Francisco ───────────────────────────────────────────────
    { name: "Golden Gate Park – Botanical Garden", category: "Parks", lat: 37.7695, lng: -122.4677, tags: ["calm", "quiet", "safe"], address: "1199 9th Ave, San Francisco, CA 94122" },
    { name: "San Francisco Public Library – Main Branch", category: "Libraries", lat: 37.7786, lng: -122.4158, tags: ["good for studying", "quiet", "safe"], address: "100 Larkin St, San Francisco, CA 94102" },
    { name: "Dolores Park – Sunny Slope", category: "Parks", lat: 37.7596, lng: -122.4269, tags: ["calm", "safe"], address: "Dolores St & 18th St, San Francisco, CA 94114" },
    { name: "Ritual Coffee Roasters – Hayes Valley", category: "Quiet Cafés", lat: 37.7769, lng: -122.4248, tags: ["quiet", "calm", "good for studying"], address: "432B Octavia St, San Francisco, CA 94102" },
    { name: "Stanford Green Library", category: "Campus Spaces", lat: 37.4264, lng: -122.1670, tags: ["quiet", "good for studying", "safe"], address: "557 Escondido Mall, Stanford, CA 94305" },
    { name: "Lands End – Sutro Baths Overlook", category: "Parks", lat: 37.7793, lng: -122.5141, tags: ["calm", "quiet", "safe"], address: "680 Point Lobos Ave, San Francisco, CA 94121" },

    // ── Boston ──────────────────────────────────────────────────────
    { name: "Boston Public Library – Copley Square", category: "Libraries", lat: 42.3492, lng: -71.0770, tags: ["good for studying", "quiet", "safe"], address: "700 Boylston St, Boston, MA 02116" },
    { name: "Arnold Arboretum", category: "Parks", lat: 42.3027, lng: -71.1266, tags: ["calm", "quiet", "safe"], address: "125 Arborway, Boston, MA 02130" },
    { name: "Harvard Square – Brattle Street", category: "Quiet Cafés", lat: 42.3736, lng: -71.1206, tags: ["calm", "good for studying"], address: "Brattle St, Cambridge, MA 02138" },
    { name: "MIT Killian Court", category: "Campus Spaces", lat: 42.3601, lng: -71.0921, tags: ["calm", "good for studying", "safe"], address: "77 Massachusetts Ave, Cambridge, MA 02139" },

    // ── Seattle ─────────────────────────────────────────────────────
    { name: "Seattle Central Library", category: "Libraries", lat: 47.6067, lng: -122.3323, tags: ["quiet", "good for studying", "safe"], address: "1000 4th Ave, Seattle, WA 98104" },
    { name: "Discovery Park – South Meadow", category: "Parks", lat: 47.6557, lng: -122.4138, tags: ["calm", "quiet", "safe"], address: "3801 Discovery Park Blvd, Seattle, WA 98199" },
    { name: "Zeitgeist Coffee", category: "Quiet Cafés", lat: 47.5993, lng: -122.3300, tags: ["calm", "quiet", "good for studying"], address: "171 S Jackson St, Seattle, WA 98104" },

    // ── Washington D.C. ─────────────────────────────────────────────
    { name: "Dumbarton Oaks Garden", category: "Parks", lat: 38.9145, lng: -77.0615, tags: ["calm", "quiet", "safe"], address: "1703 32nd St NW, Washington, DC 20007" },
    { name: "Library of Congress – Main Reading Room", category: "Libraries", lat: 38.8887, lng: -77.0047, tags: ["good for studying", "quiet", "safe", "calm"], address: "101 Independence Ave SE, Washington, DC 20540" },
    { name: "Georgetown Waterfront Park", category: "Parks", lat: 38.9032, lng: -77.0607, tags: ["calm", "safe", "quiet"], address: "3303 Water St NW, Washington, DC 20007" },
];

export async function seedRealSafeSpaces(): Promise<{ inserted: number; error: string | null }> {
    // Step 1: Clear all existing rows to avoid duplicates
    const { error: deleteError } = await supabase
        .from("safe_spaces")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
        console.error("[seedRealSafeSpaces] Delete failed:", deleteError.message);
        return { inserted: 0, error: deleteError.message };
    }

    // Step 2: Insert the fresh seed data
    const { data, error: insertError } = await supabase
        .from("safe_spaces")
        .insert(REAL_SAFE_SPACES)
        .select("id");

    if (insertError) {
        console.error("[seedRealSafeSpaces] Insert failed:", insertError.message);
        return { inserted: 0, error: insertError.message };
    }

    console.log(`[seedRealSafeSpaces] Successfully inserted ${data?.length ?? 0} safe spaces`);
    return { inserted: data?.length ?? 0, error: null };
}

export { REAL_SAFE_SPACES };
