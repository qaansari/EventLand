export const MOCK_EVENTS = [
  {
    id: "rangrez-bazaar-6478",
    title: "Rangrez Bazaar 2026",
    category: "Bazaars",
    status: "LIVE",
    isFeatured: true,
    city: "Karachi",
    venue: "Beach Luxury Hotel, Karachi",
    date: "29th Aug - 30th Aug 2026",
    time: "4:00 PM - 11:30 PM",
    priceRange: "PKR 1,500 - 3,500",
    startingPrice: 1500,
    ticketingType: "categorized", // 'categorized' or 'mapped'
    banner: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
    description: "Karachi's grandest fashion, food & cultural festival returns! Featuring over 120 artisan stalls, live Qawwali performance, organic skincare, delicious street food, and kids entertainment area.",
    organizer: "Rangrez Events & PR",
    organizerContact: "+92 331 0286867",
    scarcityText: "Only 18 tickets left at Early Bird!",
    ticketTiers: [
      { id: "std", name: "Standard Entry", price: 1500, description: "Full day access to bazaar & food stalls" },
      { id: "vip", name: "VIP Pass", price: 3500, description: "Fast-track entry + VIP Qawwali seating lounge + Complimentary drinks" }
    ]
  },
  {
    id: "surrender-tour-ali-noor-6953",
    title: "THE SURRENDER TOUR - Ali Noor Live & Exclusive",
    category: "Concerts",
    status: "LIVE",
    isFeatured: true,
    city: "Islamabad",
    venue: "Rock Music Arena, Shakarparian, Islamabad",
    date: "23rd Aug 2026",
    time: "7:30 PM Onwards",
    priceRange: "PKR 3,000 - 8,000",
    startingPrice: 3000,
    ticketingType: "mapped", // 'categorized' or 'mapped'
    banner: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    description: "Rock legend Ali Noor brings his nationwide 'Surrender Tour' to Islamabad for an unforgettable night of high-energy rock classics, hits from Noori, and unreleased live debuts.",
    organizer: "Surrender Live Entertainment",
    organizerContact: "+92 321 4455667",
    scarcityText: "VIP Zone almost sold out!",
    ticketTiers: [
      { id: "fan", name: "Fan Pit", price: 3000, description: "Standing arena access close to stage" },
      { id: "gold", name: "Gold Seating", price: 5000, description: "Numbered reserved seats with great view" },
      { id: "vip", name: "VIP Meet & Greet", price: 8000, description: "Front row seat + Photo-op with Ali Noor + Signed merchandise" }
    ],
    seatingZones: [
      { zone: "VIP Front Row", rows: 2, cols: 10, price: 8000 },
      { zone: "Gold Seating", rows: 6, cols: 12, price: 5000 },
      { zone: "Fan Pit Arena", rows: 10, cols: 16, price: 3000 }
    ]
  },
  {
    id: "mashion-bazaar-7046",
    title: "Mashion Bazaar Social Club | Yeylo by JazzCash",
    category: "Bazaars",
    status: "SELLING FAST",
    isFeatured: true,
    city: "Islamabad",
    venue: "PNCA Grounds, F-5/1, Islamabad",
    date: "19th Sep - 20th Sep 2026",
    time: "3:00 PM - 11:00 PM",
    priceRange: "PKR 2,000 - 5,000",
    startingPrice: 2000,
    ticketingType: "categorized",
    banner: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    description: "The ultimate lifestyle shopping & entertainment carnival in the heart of Islamabad. Shop apparel, jewelry, artisan crafts, enjoy live musical performances by indie artists, and feast at top food pop-ups.",
    organizer: "Mashion Events",
    organizerContact: "+92 300 8291044",
    scarcityText: "Selling Fast - 85% Sold",
    ticketTiers: [
      { id: "day1", name: "Day 1 Pass", price: 2000, description: "Single day entry for Friday 19th Sep" },
      { id: "day2", name: "Day 2 Pass", price: 2000, description: "Single day entry for Saturday 20th Sep" },
      { id: "combo", name: "Weekend VIP Combo Pass", price: 5000, description: "2-Day VIP entry with fast lane access & backstage lounge access" }
    ]
  },
  {
    id: "gidh-live-theatre-6806",
    title: "Gidh - Live Theatre Play",
    category: "Theatre",
    status: "LIVE",
    isFeatured: false,
    city: "Lahore",
    venue: "Alhamra Arts Council, Mall Road, Lahore",
    date: "4th Sep - 6th Sep 2026",
    time: "8:00 PM - 10:00 PM",
    priceRange: "PKR 1,200 - 3,000",
    startingPrice: 1200,
    ticketingType: "mapped",
    banner: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1200&q=80",
    description: "A gripping psychological thriller live play directed by renowned theatre veterans. Experience unmatched live dramatic performance, light design, and emotional intensity.",
    organizer: "Lahore Dramatic Society",
    organizerContact: "+92 345 9988771",
    scarcityText: "Limited seating available",
    ticketTiers: [
      { id: "balcony", name: "Balcony Seat", price: 1200, description: "Upper tier view" },
      { id: "hall", name: "Hall Seating", price: 2000, description: "Main auditorium row seating" },
      { id: "royal", name: "Royal Box", price: 3000, description: "Center prime view box seat" }
    ],
    seatingZones: [
      { zone: "Royal Box", rows: 2, cols: 6, price: 3000 },
      { zone: "Hall Center", rows: 8, cols: 12, price: 2000 },
      { zone: "Balcony Upper", rows: 6, cols: 10, price: 1200 }
    ]
  },
  {
    id: "dkp-asia-tour-lahore-6879",
    title: "DKP Asia Tour - Live in Lahore",
    category: "Concerts",
    status: "LIVE",
    isFeatured: false,
    city: "Lahore",
    venue: "Royal Palm Golf & Country Club, Lahore",
    date: "28th Aug 2026",
    time: "8:00 PM - Midnight",
    priceRange: "PKR 4,000 - 10,000",
    startingPrice: 4000,
    ticketingType: "categorized",
    banner: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    description: "International EDM & Fusion concert featuring DKP and guest performers. State-of-the-art laser visual production, fire drop FX, and international DJ sets.",
    organizer: "Hyperion Productions",
    organizerContact: "+92 312 8887766",
    scarcityText: "Early Bird 90% claimed!",
    ticketTiers: [
      { id: "silver", name: "Silver Standing Pass", price: 4000, description: "Access to main concert lawn" },
      { id: "gold", name: "Gold Stage Enclosure", price: 6500, description: "Elevated platform with bar counter access" },
      { id: "vip", name: "VVIP Lounge Pass", price: 10000, description: "Private table service + food & beverages included" }
    ]
  },
  {
    id: "inclusion-rocks-karachi-6642",
    title: "Inclusion Rocks - Music for All",
    category: "Concerts",
    status: "LIVE",
    isFeatured: false,
    city: "Karachi",
    venue: "Arts Council Amphitheatre, Karachi",
    date: "29th Aug 2026",
    time: "6:00 PM - 10:30 PM",
    priceRange: "PKR 1,000 - 2,500",
    startingPrice: 1000,
    ticketingType: "categorized",
    banner: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
    description: "A charity & inclusive concert uniting Pakistan's top musicians and specially-abled artists under one banner. All ticket sales support accessible arts education.",
    organizer: "Inclusion Pakistan Foundation",
    organizerContact: "+92 333 1112233",
    scarcityText: "Supporting cause - 500 tickets left",
    ticketTiers: [
      { id: "donor", name: "Donor Ticket", price: 1000, description: "Standard open amphitheatre seating" },
      { id: "patron", name: "Patron Pass", price: 2500, description: "Front reserved seating + Souvenir badge" }
    ]
  },
  {
    id: "karachi-comedy-fest-2026",
    title: "Karachi Laughathon Comedy Night",
    category: "Comedy",
    status: "SELLING FAST",
    isFeatured: false,
    city: "Karachi",
    venue: "PACC Auditorium, Cantt, Karachi",
    date: "5th Sep 2026",
    time: "8:30 PM - 11:00 PM",
    priceRange: "PKR 1,800 - 3,500",
    startingPrice: 1800,
    ticketingType: "categorized",
    banner: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80",
    description: "Get ready for a night of non-stop laughter with 6 of Pakistan's funniest stand-up comedians. Uncensored, relatable, and hilarious comedy routines.",
    organizer: "Chai & Jokes Syndicate",
    organizerContact: "+92 301 7766554",
    scarcityText: "Only 45 tickets left!",
    ticketTiers: [
      { id: "standard", name: "Standard Seat", price: 1800, description: "Auditorium seating" },
      { id: "front", name: "Front Row Roast Zone", price: 3500, description: "Be part of the action in the front 2 rows" }
    ]
  },
  {
    id: "lahore-street-food-fiesta",
    title: "Lahore Street Food & Qawwali Night",
    category: "Food",
    status: "LIVE",
    isFeatured: false,
    city: "Lahore",
    venue: "Greater Iqbal Park, Lahore",
    date: "12th Sep - 13th Sep 2026",
    time: "5:00 PM - Midnight",
    priceRange: "PKR 800 - 2,000",
    startingPrice: 800,
    ticketingType: "categorized",
    banner: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    description: "Indulge in 80+ iconic food stalls from across Lahore, live Qawwali by Badar Ali Khan family, food eating competitions, and fireworks show.",
    organizer: "Lahore Eats Co.",
    organizerContact: "+92 322 9900112",
    scarcityText: "Family entry special",
    ticketTiers: [
      { id: "entry", name: "Foodie Entry Ticket", price: 800, description: "Access to all food stalls & live stage" },
      { id: "family", name: "Family Pass (4 Persons)", price: 2000, description: "Entry for 4 + Free food vouchers worth PKR 500" }
    ]
  }
];

export const CITIES = ["All Cities", "Karachi", "Lahore", "Islamabad", "Rawalpindi"];
export const CATEGORIES = ["All", "Concerts", "Bazaars", "Theatre", "Comedy", "Food", "Workshops"];
