// Keywords are checked with substring match in the order listed.
// Put longer/more-specific strings before shorter ones that would shadow them
// (e.g. 'grab food' before 'grab', 'amazon prime' before 'amazon').
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    // Delivery — must come before plain 'grab' / 'uber'
    'grab food', 'grabfood', 'grab*food', 'foodpanda', 'deliveroo',
    'uber eats', 'ubereats', 'doordash', 'postmates',
    // Coffee
    'starbucks', 'coffee bean', 'dutch colony', 'dunkin',
    // Chains — SG
    "mcdonald's", 'mcdonalds', 'burger king', 'subway', 'kfc',
    'toast box', 'toastbox', 'kopitiam', 'old chang kee',
    'bengawan solo', 'bread talk', 'breadtalk', 'ya kun',
    'mos burger', 'jollibee', 'pepper lunch', 'saizeriya',
    'crystal jade', 'din tai fung', 'swensen', 'shake shack',
    'hawker', 'food court', 'canteen',
    // Chains — US
    'chipotle', 'chick-fil-a', 'chickfila', 'panera', 'taco bell',
    "wendy's", 'wendys', 'dominos', "domino's", 'five guys', 'panda express',
    // Generic
    'restaurant', 'cafe', 'coffee', 'pizza', 'sushi', 'ramen',
    'eatery', 'bistro', 'bakery',
  ],
  'Groceries': [
    // SG
    'meidi-ya', 'fairprice', 'cold storage', 'sheng siong',
    'prime supermarket', 'giant hypermart', 'giant hypermarket',
    'jasons', 'redmart', 'marketplace by',
    // US
    'whole foods', 'trader joe', 'safeway', 'kroger', 'costco',
    'publix', 'aldi', 'h mart', 'hmart', 'sprouts', 'wegmans',
    // Generic
    'supermarket', 'hypermarket', 'grocery', 'provisions', 'wet market',
  ],
  'Transport': [
    // Ride-hail — 'grab' after grabfood variants above
    'grab', 'gojek', 'comfortdelgro', 'comfort delgro', 'smrt',
    'ez-link', 'ezlink', 'transitlink', 'ryde',
    'uber', 'lyft', 'zipcar',
    'hdb car park', 'ura carpark',
    // Generic
    'taxi', 'mrt', 'bus', 'parking', 'toll', 'petrol', 'fuel', 'car park',
  ],
  'Utilities & Bills': [
    'sp group', 'sp services', 'singtel', 'starhub', 'm1 limited',
    'circles.life', 'town council', 'conservancy',
    'electricity', 'water', 'gas', 'broadband',
  ],
  'Shopping': [
    // Must come after 'amazon prime' in Subscriptions — order between categories
    // doesn't matter since categories are checked in insertion order and
    // 'Subscriptions' is listed after 'Shopping'. So put 'amazon prime' first
    // inside Subscriptions to ensure it wins.
    'shopee', 'lazada', 'amazon',
    'uniqlo', 'zara', 'h&m', 'ikea',
    'courts', 'best denki', 'harvey norman', 'challenger',
    'daiso', 'don don donki', 'donki',
    'watsons', 'guardian', 'muji',
    // US
    'walmart', 'target', 'best buy', 'ebay', 'etsy', 'nordstrom', 'old navy',
    // Generic
    'retail', 'boutique',
  ],
  'Travel': [
    'singapore airlines', 'scoot', 'jetstar', 'airasia', 'cathay pacific',
    'changi airport', 'airbnb', 'booking.com', 'agoda', 'expedia', 'klook',
    'hotel', 'hostel', 'resort', 'airlines', 'flight', 'ferry', 'airport',
  ],
  'Healthcare': [
    'raffles medical', 'raffles hospital', 'raffles health',
    'parkway', 'mount elizabeth', 'gleneagles', 'polyclinic',
    'ntuc unity', 'guardian pharmacy',
    'cvs', 'walgreens', 'rite aid',
    'clinic', 'pharmacy', 'hospital', 'dentist', 'dental',
    'vision', 'optical', 'physiotherapy',
  ],
  'Subscriptions': [
    'amazon prime',   // before 'amazon' in Shopping
    'netflix', 'spotify', 'apple.com/bill', 'icloud', 'google one',
    'youtube premium', 'disney+', 'disneyplus',
    'chatgpt', 'openai', 'claude.ai', 'adobe', 'microsoft 365',
    'hbo', 'hulu',
    'subscription', 'membership',
  ],
  'Income': [
    'salary', 'payroll', 'interest', 'dividend', 'bonus', 'credit interest',
    'rebate', 'cashback', 'refund',
  ],
  'Transfers & Payments': [
    'paynow', 'paylah', 'giro',
    'atm withdrawal', 'cash withdrawal',
    'transfer', 'payment', 'paymt', 'bill payment',
  ],
  'Investments': [
    'ibkr', 'interactive brokers', 'tiger brokers', 'moomoo',
    'syfe', 'endowus', 'stashaway',
    'dbs vickers', 'uob kay hian', 'phillip securities', 'cimb securities',
    'brokerage', 'cpf', 'srs',
  ],
};

export const FALLBACK_CATEGORY = 'Others';

export const ALL_CATEGORIES = [...Object.keys(CATEGORY_KEYWORDS), FALLBACK_CATEGORY];
