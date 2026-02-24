export interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  status: "upcoming" | "on-sale" | "sold-out";
}

export const events: Event[] = [
  {
    id: "1",
    title: "BTS 2025 Reunion Concert - Seoul",
    date: "2025-10-11",
    venue: "Jamsil Olympic Stadium, Seoul",
    description: "The long-awaited reunion concert bringing all 7 members back together on stage. A celebration of BTS and ARMY.",
    status: "sold-out"
  },
  {
    id: "2",
    title: "BTS 2025 Reunion Concert - Seoul Day 2",
    date: "2025-10-12",
    venue: "Jamsil Olympic Stadium, Seoul",
    description: "Second day of the historic reunion concert in Seoul.",
    status: "sold-out"
  },
  {
    id: "3",
    title: "BTS World Tour - Tokyo Dome",
    date: "2026-03-15",
    venue: "Tokyo Dome, Tokyo, Japan",
    description: "BTS brings their world tour to Tokyo Dome for an unforgettable night.",
    status: "on-sale"
  },
  {
    id: "4",
    title: "BTS World Tour - Tokyo Dome Day 2",
    date: "2026-03-16",
    venue: "Tokyo Dome, Tokyo, Japan",
    description: "Second show at Tokyo Dome with a special setlist.",
    status: "on-sale"
  },
  {
    id: "5",
    title: "BTS World Tour - SoFi Stadium LA",
    date: "2026-05-20",
    venue: "SoFi Stadium, Los Angeles, USA",
    description: "BTS returns to SoFi Stadium for their North American tour dates.",
    status: "upcoming"
  },
  {
    id: "6",
    title: "BTS World Tour - SoFi Stadium LA Day 2",
    date: "2026-05-21",
    venue: "SoFi Stadium, Los Angeles, USA",
    description: "Second night at SoFi Stadium with exclusive performances.",
    status: "upcoming"
  },
  {
    id: "7",
    title: "BTS World Tour - MetLife Stadium NYC",
    date: "2026-06-07",
    venue: "MetLife Stadium, New Jersey, USA",
    description: "East coast stop of the world tour at MetLife Stadium.",
    status: "upcoming"
  },
  {
    id: "8",
    title: "BTS World Tour - Wembley Stadium",
    date: "2026-07-12",
    venue: "Wembley Stadium, London, UK",
    description: "BTS returns to Wembley for a massive European concert.",
    status: "upcoming"
  },
  {
    id: "9",
    title: "New Album Release",
    date: "2026-04-01",
    venue: "Worldwide",
    description: "Brand new group album dropping worldwide across all streaming platforms.",
    status: "upcoming"
  }
];
