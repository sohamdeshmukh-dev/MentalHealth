/**
 * Complete hardcoded college catalog for all 11 supported cities.
 * Used as a client-side fallback when the colleges table isn't available,
 * and as the source of truth for the CollegePicker component.
 */

export interface CollegeEntry {
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  campus_radius: number;
  domain: string;
}

/** Returns a logo URL for a college using Google's favicon service */
export function getCollegeLogoUrl(domain: string, size: number = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/** Find a college entry by name */
export function findCollegeByName(name: string): CollegeEntry | undefined {
  return ALL_COLLEGES.find((c) => c.name === name);
}

export const ALL_COLLEGES: CollegeEntry[] = [
  // ── New York City ──────────────────────────────────────────────
  { name: "Columbia University", city: "New York City", latitude: 40.8075, longitude: -73.9626, campus_radius: 1.8, domain: "columbia.edu" },
  { name: "New York University", city: "New York City", latitude: 40.7295, longitude: -73.9965, campus_radius: 1.5, domain: "nyu.edu" },
  { name: "City College of New York", city: "New York City", latitude: 40.8198, longitude: -73.9492, campus_radius: 1.2, domain: "ccny.cuny.edu" },
  { name: "Fordham University", city: "New York City", latitude: 40.8614, longitude: -73.8854, campus_radius: 1.3, domain: "fordham.edu" },
  { name: "The New School", city: "New York City", latitude: 40.7353, longitude: -73.9975, campus_radius: 1.0, domain: "newschool.edu" },
  { name: "Pace University", city: "New York City", latitude: 40.7112, longitude: -74.0055, campus_radius: 1.0, domain: "pace.edu" },
  { name: "Hunter College", city: "New York City", latitude: 40.7685, longitude: -73.9648, campus_radius: 1.0, domain: "hunter.cuny.edu" },
  { name: "Baruch College", city: "New York City", latitude: 40.7404, longitude: -73.9836, campus_radius: 1.0, domain: "baruch.cuny.edu" },

  // ── Los Angeles ────────────────────────────────────────────────
  { name: "University of California, Los Angeles", city: "Los Angeles", latitude: 34.0689, longitude: -118.4452, campus_radius: 2.0, domain: "ucla.edu" },
  { name: "University of Southern California", city: "Los Angeles", latitude: 34.0224, longitude: -118.2851, campus_radius: 1.7, domain: "usc.edu" },
  { name: "Loyola Marymount University", city: "Los Angeles", latitude: 33.9701, longitude: -118.4165, campus_radius: 1.3, domain: "lmu.edu" },
  { name: "California State University, Los Angeles", city: "Los Angeles", latitude: 34.0664, longitude: -118.1685, campus_radius: 1.5, domain: "calstatela.edu" },
  { name: "Occidental College", city: "Los Angeles", latitude: 34.1278, longitude: -118.2106, campus_radius: 1.0, domain: "oxy.edu" },
  { name: "California State University, Northridge", city: "Los Angeles", latitude: 34.2400, longitude: -118.5291, campus_radius: 1.6, domain: "csun.edu" },

  // ── Chicago ────────────────────────────────────────────────────
  { name: "University of Chicago", city: "Chicago", latitude: 41.7886, longitude: -87.5987, campus_radius: 1.8, domain: "uchicago.edu" },
  { name: "University of Illinois Chicago", city: "Chicago", latitude: 41.8708, longitude: -87.6505, campus_radius: 1.6, domain: "uic.edu" },
  { name: "Northwestern University", city: "Chicago", latitude: 42.0565, longitude: -87.6753, campus_radius: 1.9, domain: "northwestern.edu" },
  { name: "DePaul University", city: "Chicago", latitude: 41.9253, longitude: -87.6554, campus_radius: 1.3, domain: "depaul.edu" },
  { name: "Loyola University Chicago", city: "Chicago", latitude: 41.9998, longitude: -87.6583, campus_radius: 1.4, domain: "luc.edu" },
  { name: "Illinois Institute of Technology", city: "Chicago", latitude: 41.8348, longitude: -87.6270, campus_radius: 1.2, domain: "iit.edu" },

  // ── Houston ────────────────────────────────────────────────────
  { name: "Rice University", city: "Houston", latitude: 29.7174, longitude: -95.4018, campus_radius: 1.7, domain: "rice.edu" },
  { name: "University of Houston", city: "Houston", latitude: 29.7199, longitude: -95.3422, campus_radius: 1.8, domain: "uh.edu" },
  { name: "Texas Southern University", city: "Houston", latitude: 29.7211, longitude: -95.3590, campus_radius: 1.4, domain: "tsu.edu" },
  { name: "Houston Baptist University", city: "Houston", latitude: 29.7073, longitude: -95.5562, campus_radius: 1.3, domain: "hbu.edu" },
  { name: "University of St. Thomas", city: "Houston", latitude: 29.7384, longitude: -95.4161, campus_radius: 1.0, domain: "stthom.edu" },

  // ── Phoenix ────────────────────────────────────────────────────
  { name: "Arizona State University - Downtown Phoenix", city: "Phoenix", latitude: 33.4534, longitude: -112.0738, campus_radius: 1.5, domain: "asu.edu" },
  { name: "Grand Canyon University", city: "Phoenix", latitude: 33.5122, longitude: -112.1299, campus_radius: 1.7, domain: "gcu.edu" },
  { name: "University of Arizona College of Medicine - Phoenix", city: "Phoenix", latitude: 33.4652, longitude: -112.0736, campus_radius: 1.2, domain: "medicine.arizona.edu" },
  { name: "Arizona State University - Tempe", city: "Phoenix", latitude: 33.4242, longitude: -111.9281, campus_radius: 2.0, domain: "asu.edu" },
  { name: "Phoenix College", city: "Phoenix", latitude: 33.4502, longitude: -112.0982, campus_radius: 1.1, domain: "phoenixcollege.edu" },

  // ── Philadelphia ───────────────────────────────────────────────
  { name: "University of Pennsylvania", city: "Philadelphia", latitude: 39.9522, longitude: -75.1932, campus_radius: 1.7, domain: "upenn.edu" },
  { name: "Drexel University", city: "Philadelphia", latitude: 39.9566, longitude: -75.1899, campus_radius: 1.5, domain: "drexel.edu" },
  { name: "Temple University", city: "Philadelphia", latitude: 39.9812, longitude: -75.1553, campus_radius: 1.6, domain: "temple.edu" },
  { name: "Saint Joseph's University", city: "Philadelphia", latitude: 39.9973, longitude: -75.2370, campus_radius: 1.2, domain: "sju.edu" },
  { name: "La Salle University", city: "Philadelphia", latitude: 40.0384, longitude: -75.1553, campus_radius: 1.1, domain: "lasalle.edu" },
  { name: "Thomas Jefferson University", city: "Philadelphia", latitude: 39.9487, longitude: -75.1580, campus_radius: 1.0, domain: "jefferson.edu" },

  // ── San Antonio ────────────────────────────────────────────────
  { name: "The University of Texas at San Antonio", city: "San Antonio", latitude: 29.5849, longitude: -98.6177, campus_radius: 2.0, domain: "utsa.edu" },
  { name: "Trinity University", city: "San Antonio", latitude: 29.4633, longitude: -98.4826, campus_radius: 1.3, domain: "trinity.edu" },
  { name: "St. Mary's University", city: "San Antonio", latitude: 29.4256, longitude: -98.5418, campus_radius: 1.2, domain: "stmarytx.edu" },
  { name: "University of the Incarnate Word", city: "San Antonio", latitude: 29.4625, longitude: -98.4674, campus_radius: 1.3, domain: "uiw.edu" },
  { name: "Our Lady of the Lake University", city: "San Antonio", latitude: 29.4002, longitude: -98.5232, campus_radius: 1.0, domain: "ollusa.edu" },

  // ── San Diego ──────────────────────────────────────────────────
  { name: "University of California San Diego", city: "San Diego", latitude: 32.8801, longitude: -117.2340, campus_radius: 2.2, domain: "ucsd.edu" },
  { name: "San Diego State University", city: "San Diego", latitude: 32.7757, longitude: -117.0716, campus_radius: 1.8, domain: "sdsu.edu" },
  { name: "University of San Diego", city: "San Diego", latitude: 32.7719, longitude: -117.1887, campus_radius: 1.3, domain: "sandiego.edu" },
  { name: "Point Loma Nazarene University", city: "San Diego", latitude: 32.7172, longitude: -117.2450, campus_radius: 1.2, domain: "pointloma.edu" },
  { name: "San Diego Christian College", city: "San Diego", latitude: 32.8078, longitude: -116.9606, campus_radius: 1.0, domain: "sdcc.edu" },

  // ── Dallas ─────────────────────────────────────────────────────
  { name: "Southern Methodist University", city: "Dallas", latitude: 32.8426, longitude: -96.7848, campus_radius: 1.6, domain: "smu.edu" },
  { name: "The University of Texas at Dallas", city: "Dallas", latitude: 32.9858, longitude: -96.7501, campus_radius: 1.8, domain: "utdallas.edu" },
  { name: "Dallas Baptist University", city: "Dallas", latitude: 32.7073, longitude: -96.9452, campus_radius: 1.4, domain: "dbu.edu" },
  { name: "University of North Texas at Dallas", city: "Dallas", latitude: 32.6571, longitude: -96.7461, campus_radius: 1.3, domain: "untdallas.edu" },
  { name: "Paul Quinn College", city: "Dallas", latitude: 32.6874, longitude: -96.7475, campus_radius: 1.0, domain: "pqc.edu" },

  // ── Jacksonville ───────────────────────────────────────────────
  { name: "University of North Florida", city: "Jacksonville", latitude: 30.2699, longitude: -81.5072, campus_radius: 1.9, domain: "unf.edu" },
  { name: "Jacksonville University", city: "Jacksonville", latitude: 30.3504, longitude: -81.6031, campus_radius: 1.4, domain: "ju.edu" },
  { name: "Edward Waters University", city: "Jacksonville", latitude: 30.3333, longitude: -81.6931, campus_radius: 1.2, domain: "ewu.edu" },
  { name: "Florida State College at Jacksonville", city: "Jacksonville", latitude: 30.3546, longitude: -81.6634, campus_radius: 1.3, domain: "fscj.edu" },

  // ── Charlottesville ────────────────────────────────────────────
  { name: "University of Virginia", city: "Charlottesville", latitude: 38.0356, longitude: -78.5034, campus_radius: 1.8, domain: "virginia.edu" },
  { name: "Piedmont Virginia Community College", city: "Charlottesville", latitude: 38.0246, longitude: -78.4369, campus_radius: 1.1, domain: "pvcc.edu" },
  { name: "University of Virginia School of Law", city: "Charlottesville", latitude: 38.0500, longitude: -78.5074, campus_radius: 1.0, domain: "law.virginia.edu" },
];

/** Get all colleges for a specific city */
export function getCollegesByCity(city: string): CollegeEntry[] {
  return ALL_COLLEGES.filter((c) => c.city === city);
}

/** Get all unique city names that have colleges */
export function getCitiesWithColleges(): string[] {
  return [...new Set(ALL_COLLEGES.map((c) => c.city))];
}
