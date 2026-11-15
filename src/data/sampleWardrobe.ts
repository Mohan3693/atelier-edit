import type { SampleGarment } from '../types/stylist';
import sampleJacquardSkirt from '../assets/images/sample_jacquard_skirt_1794675093317.jpg';
import flatLaySampleCasual from '../assets/images/flatlay_sample_casual_1794675095827.jpg';
import flatLaySampleBusiness from '../assets/images/flatlay_sample_business_1794675097059.jpg';
import flatLaySampleNightOut from '../assets/images/flatlay_sample_nightout_1794675098012.jpg';
import sampleEmeraldSlip from '../assets/images/sample_emerald_slip_1794675093539.jpg';
import sampleHoundstoothBlazer from '../assets/images/sample_houndstooth_blazer_1794675095101.jpg';

export const SAMPLE_WARDROBE: SampleGarment[] = [
  {
    id: 'sample-jacquard-skirt',
    name: 'Botanical Jacquard Midi Skirt',
    subtitle: 'Cobalt, forest green & ochre woven A-line',
    category: 'Patterned Skirt',
    imageUrl: sampleJacquardSkirt,
    challengeNote: 'Dense multi-color botanical weave that easily clashes with competing prints.',
    precomputedAnalysis: {
      itemName: 'Botanical Jacquard Midi Skirt',
      category: 'A-Line Midi Skirt',
      silhouette: 'Structured high-waisted A-line flare hitting mid-calf',
      fabricAndTexture: 'Matte-lustre woven cotton-silk jacquard with raised relief threads',
      patternDescription: 'Intricate dark-ground botanical motif in cobalt, forest green, and warm ochre',
      stylePersonality: 'Gallery Editorial · Heritage Tailored',
      stylingStrategy:
        'Anchor the dense floral brocade with clean, solid-surface textures—crisp cotton, fine-gauge merino, and unembellished silk—allowing one metallic or neutral leather tone to bridge all three looks.',
      palette: [
        { name: 'Midnight Indigo', hex: '#18243E', role: 'Primary' },
        { name: 'Cobalt Bloom', hex: '#1F4DA1', role: 'Secondary' },
        { name: 'Botanical Pine', hex: '#1F634A', role: 'Secondary' },
        { name: 'Warm Ochre', hex: '#B4762C', role: 'Accent' },
        { name: 'Gallery Chalk', hex: '#F3F1EC', role: 'Neutral' },
      ],
    },
    precomputedOutfits: [
      {
        id: 'jacquard-casual',
        occasion: 'Casual',
        title: 'Sunday Architecture Walk',
        moodSummary: 'Light-wash denim and crisp white cotton dial down the formal brocade for daylight.',
        colorHarmonyNote: 'Mid-tone indigo denim echoes the cobalt weave while tan woven leather picks up the warm ochre leaves.',
        colorPaletteCategory: 'Complementary',
        flatLayImageUrl: flatLaySampleCasual,
        flatLayStatus: 'ready',
        flatLayPrompt:
          'Overhead fashion flat-lay of a cobalt and ochre botanical jacquard midi skirt with a crisp white tee, cropped light-wash denim jacket, white leather sneakers, woven tan crossbody bag, and tortoiseshell sunglasses on alabaster studio paper.',
        editHistory: [],
        pieces: [
          {
            slot: 'Top',
            name: 'Heavyweight Crewneck Tee',
            colorName: 'Optic White',
            colorHex: '#F7F7F5',
            material: 'Combed organic cotton jersey',
            stylingTip: 'French-tuck cleanly to define the high waist.',
          },
          {
            slot: 'Outerwear',
            name: 'Cropped Trucker Jacket',
            colorName: 'Vintage Mid-Wash',
            colorHex: '#5A82B0',
            material: '12oz rigid selvedge denim',
            stylingTip: 'Cropped hem hits right above the skirt waistband.',
          },
          {
            slot: 'Footwear',
            name: 'Minimalist Court Sneakers',
            colorName: 'Chalk White & Gum',
            colorHex: '#EFECE6',
            material: 'Full-grain calfskin with gum sole',
            stylingTip: 'Gum outsole subtly echoes the ochre florals.',
          },
          {
            slot: 'Bag & Eyewear',
            name: 'Woven Crossbody & Tortoise Frames',
            colorName: 'Cognac Tan',
            colorHex: '#B68452',
            material: 'Hand-plaited vegetable-tanned leather',
            stylingTip: 'Warm leather warms up the cool indigo ground.',
          },
        ],
      },
      {
        id: 'jacquard-business',
        occasion: 'Business',
        title: 'Executive Gallery Briefing',
        moodSummary: 'Architectural charcoal wool and a fine ivory knit turn the statement skirt boardroom-ready.',
        colorHarmonyNote: 'Soft ivory brightens near the face while charcoal wool grounds the midnight indigo base without harshness.',
        colorPaletteCategory: 'Neutral Tones',
        flatLayImageUrl: flatLaySampleBusiness,
        flatLayStatus: 'ready',
        flatLayPrompt:
          'Overhead fashion flat-lay of a cobalt and ochre botanical jacquard midi skirt with a fine ivory merino turtleneck, tailored charcoal wool blazer, black pointed-toe loafers, structured black tote, and gold dress watch on alabaster studio paper.',
        editHistory: [],
        pieces: [
          {
            slot: 'Top',
            name: 'Fine-Gauge Turtleneck Knit',
            colorName: 'Warm Ivory',
            colorHex: '#F2EDE2',
            material: 'Extra-fine merino wool',
            stylingTip: 'Smooth matte knit avoids competing with jacquard texture.',
          },
          {
            slot: 'Outerwear',
            name: 'Single-Breasted Tailored Blazer',
            colorName: 'Charcoal Slate',
            colorHex: '#353638',
            material: 'Tropical-weight virgin wool',
            stylingTip: 'Wear open to frame the patterned front panel.',
          },
          {
            slot: 'Footwear',
            name: 'Pointed-Toe Penny Loafers',
            colorName: 'Onyx Black',
            colorHex: '#191918',
            material: 'Brushed box calf leather',
            stylingTip: 'Elongates the silhouette beneath a mid-calf hem.',
          },
          {
            slot: 'Bag & Timepiece',
            name: 'Structured Tote & Gold Leather Watch',
            colorName: 'Espresso Black & Gold',
            colorHex: '#22201E',
            material: 'Pebbled leather with brass hardware',
            stylingTip: 'Brass hardware subtly links back to the ochre motif.',
          },
        ],
      },
      {
        id: 'jacquard-nightout',
        occasion: 'Night Out',
        title: 'Candlelit Vernissage',
        moodSummary: 'Fluid black silk and warm bronze metallics amplify the evening sheen of the jacquard.',
        colorHarmonyNote: 'Warm metallic bronze bridges the gold-ochre threadwork and dark navy ground under evening light.',
        colorPaletteCategory: 'Analogous',
        flatLayImageUrl: flatLaySampleNightOut,
        flatLayStatus: 'ready',
        flatLayPrompt:
          'Overhead fashion flat-lay of a cobalt and ochre botanical jacquard midi skirt with a black silk camisole, strappy metallic bronze heeled sandals, mini black satin clutch, and sculptural gold drop earrings on alabaster studio paper.',
        editHistory: [],
        pieces: [
          {
            slot: 'Top',
            name: 'Bias-Cut Silk Camisole',
            colorName: 'Jet Black',
            colorHex: '#151516',
            material: '19-momme mulberry silk charmeuse',
            stylingTip: 'Delicate neckline offsets the structured A-line skirt.',
          },
          {
            slot: 'Footwear',
            name: 'Strappy Heeled Sandals',
            colorName: 'Burnished Bronze',
            colorHex: '#8E6142',
            material: 'Metallic nappa leather',
            stylingTip: 'Keep straps minimal so the hem remains the focal point.',
          },
          {
            slot: 'Bag',
            name: 'Chain-Strap Satin Clutch',
            colorName: 'Noir Satin',
            colorHex: '#1B1B1D',
            material: 'Matte duchesse satin with gold clasp',
            stylingTip: 'Tuck the chain inside for a sleek handheld silhouette.',
          },
          {
            slot: 'Jewelry',
            name: 'Sculptural Organic Drop Earrings',
            colorName: 'Brushed Gold',
            colorHex: '#C5A258',
            material: '18k gold-plated brass',
            stylingTip: 'Skip a necklace to keep the collarbone clean.',
          },
        ],
      },
    ],
  },
  {
    id: 'sample-emerald-slip',
    name: 'Emerald Silk Satin Slip Dress',
    subtitle: 'Bias-cut jewel-tone midi with delicate straps',
    category: 'Evening Dress',
    imageUrl: sampleEmeraldSlip,
    challengeNote: 'Often feels overly formal or single-occasion without intentional daytime layering.',
  },
  {
    id: 'sample-houndstooth-blazer',
    name: 'Rust Houndstooth Wool Blazer',
    subtitle: 'Oversized heritage check in terracotta, espresso & cream',
    category: 'Statement Outerwear',
    imageUrl: sampleHoundstoothBlazer,
    challengeNote: 'Warm micro-check pattern can quickly look dated unless paired with modern proportions.',
  },
];
