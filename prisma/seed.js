// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

/**
 * Usage:
 * node prisma/seed.js                  -> seed default (creates custom users and posts from the list)
 * node prisma/seed.js --deleteCustom   -> delete posts and users created by this custom script
 * node prisma/seed.js --deleteAll      -> delete ALL data from database
 * node prisma/seed.js --reset          -> delete all data and seed fresh data
 *
 * NPM Scripts:
 * npm run seed                         -> create custom dummy posts
 * npm run seed:reset                   -> delete all data and seed fresh
 * npm run seed:deleteAll               -> delete ALL data from database
 * npm run seed:deleteDummy             -> delete only custom dummy posts
 * npm run seed:delete                  -> delete ALL data from database (alias)
 */

// --- Profile Picture URLs ---
const profileImageUrls = [
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529957/mW4PZB45isHmnjGkLpJvjKBzVS5NXzTJ8UDyug4gTsM_t0cftt.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529956/UxuuMeyX2pZPHmGZ2w3Q8MysvExCAquMtvEfqp2etvm_bqykdw.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529956/J6TDXvarvpBdPXTaTU8eJbtso1PUCYKGkVtMKUUY8iEa_ibxm9e.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529956/GJA1HEbxGnqBhBifH9uQauzXSB53to5rhDrzmKxhSU65_b4rnjk.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529956/GwoFJFjUTUSWq2EwTz4P2Sznoq9XYLrf8t4q5kbTgZ1R_v9y4ha.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529955/G6fUXjMKPJzCY1rveAE6Qm7wy5U3vZgKDJmN1VPAdiZC_eahfon.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529940/DZAa55HwXgv5hStwaTEJGXZz1DhHejvpb7Yr762urXam_fk4jdm.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529940/F1WT79Jkw3BkBDUfCbrKKo15ghZNCEjvnjxQpiCfPuRM_bod2a6.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529940/FAicXNV5FVqtfbpn4Zccs71XcfGeyxBSGbqLDyDJZjke_aeo3xk.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529940/EHg5YkU2SZBTvuT87rUsvxArGp3HLeye1fXaSDfuMyaf_rsjdsr.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529940/G3g1CKqKWSVEVURZDNMazDBv7YAhMNTjhJBVRTiKZygk_tzecuz.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529940/F5jWYuiDLTiaLYa54D88YbpXgEsA6NKHzWy4SN4bMYjt_dp5rsc.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529939/EaVboaPxFCYanjoNWdkxTbPvt57nhXGu5i6m9m6ZS2kK_vfujmr.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529939/DuGezKLZp8UL2aQMHthoUibEC7WSbpNiKFJLTtK1QHjx_wr3vrt.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529938/DsqRyTUh1R37asYcVf1KdX4CNnz5DKEFmnXvgT4NfTPE_jp1sc7.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529914/DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm_beafoo.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529892/CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o_gthehh.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529871/Cxe1d5zFifK4a4UZoHQaCK7sfqd84XjcKy1qtjnz3bge_szyvj1.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529828/CvNiezB8hofusHCKqu8irJ6t2FKY7VjzpSckofMzk5mB_bsfptr.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/CA4keXLtGJWBcsWivjtMFBghQ8pFsGRWFxLrRCtirzu5_e4namc.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/An68XCxJvfXc9NRWjNXGSFY55dyFVKjfgtpt8AKGJ2dE_x1ahdd.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/BQVz7fQ1WsQmSTMY3umdPEPPTm1sdcBcX9sP7o6kPRmB_lbyabu.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/BNahnx13rLru9zxuWNGBD7vVv1pGQXB11Q7qeTyupdWf_cwvgca.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/BCnqsPEtA1TkgednYEebRpkmwFRJDCjMQcKZMMtEdArc_oelo2l.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/9FNz4MjPUmnJqTf6yEDbL1D4SsHVh7uA8zRHhR5K138r_wwsqmv.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/AGnd5WTHMUbyK3kjjQPdQFM3TbWcuPTtkwBFWVUwiCLu_nllqpn.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529827/AeLaMjzxErZt4drbWVWvcxpVyo8p94xu5vrg41eZPFe3_qiqnza.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529826/9Vk7pkBZ9KFJmzaPzNYjGedyz8qoKMQtnYyYi2AehNMT_b6xqla.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529826/96sErVjEN7LNJ6Uvj63bdRWZxNuBngj56fnT9biHLKBf_aizrk7.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529825/8MaVa9kdt3NW4Q5HyNAm1X5LbR8PQRVDc1W8NMVK88D5_qe55zc.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529826/5B79fMkcFeRTiwm7ehsZsFiKsC7m7n1Bgv9yLxPp9q2X_a18zve.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529825/4sAUSQFdvWRBxR8UoLBYbw8CcXuwXWxnN8pXa4mtm5nU_imafpo.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529825/7VBTpiiEjkwRbRGHJFUz6o5fWuhPFtAmy8JGhNqwHNnn_gq0kr6.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529825/4sAUSQFdvWRBxR8UoLBYbw8CcXuwXWxnN8pXa4mtm5nU_1_jwqhuj.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529825/5B52w1ZW9tuwUduueP5J7HXz5AcGfruGoX6YoAudvyxG_pntrlf.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529825/4nvNc7dDEqKKLM4Sr9Kgk3t1of6f8G66kT64VoC95LYh_jqmuzm.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529824/4Be9CvxqHW6BYiRAxW9Q3xu1ycTMWaL5z8NX4HR3ha7t_i225iv.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529824/71PCu3E4JP5RDBoY6wJteqzxkKNXLyE1byg5BTAL9UtQ_zm1aa7.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529824/4DdrfiDHpmx55i4SPssxVzS9ZaKLb8qr45NKY9Er9nNh_bgy4g0.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529824/4BdKaxN8G6ka4GYtQQWk4G4dZRUTX2vQH9GcXdBREFUk_k21sye.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529823/5T229oePmJGE5Cefys8jE9Jq8C7qfGNNWy3RVA7SmwEP_ihthct.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529824/3i8akM4xfSX9WKFB5bQ61fmiYkeKQEFqvdMEyu6pSEk9_wvwzyr.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529823/3pZ59YENxDAcjaKa3sahZJBcgER4rGYi4v6BpPurmsGj_ija4qe.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529823/2T5NgDDidkvhJQg8AHDi74uCFwgp25pYFMRZXBaCUNBH_fl4as9.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529823/5vg7he5HibvsAW86wfiuP6jw7VwKmUAnP6P93mVCdpJu_s7iqw7.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756529823/5d3jQcuUvsuHyZkhdp78FFqc7WogrzZpTtec1X9VNkuE_gvovc3.jpg",
];

// --- Post Image URLs ---
const postImageUrlsRaw = [
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535108/photo_2025-08-13_23-06-02_ojug1s.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535107/photo_2025-08-13_21-09-57_okyjgc.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535107/photo_2025-08-13_21-08-39_oghk4d.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535106/photo_2025-08-13_23-05-38_bkpabq.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535106/photo_2025-08-13_23-04-46_-_Copy_uba2ko.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535105/7_xcbqps.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535105/photo_2025-08-13_20-57-28_vmsrlk.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535105/photo_2025-08-13_20-57-42_jhltqo.jpg",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535105/9_lh7knb.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535105/6_u0gwkm.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535104/46_u9mkoz.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535103/5_e5tsw8.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535103/45_jlc7k3.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535102/4png_hxhhy0.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535102/47_w49qbc.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535100/42_iiqjmj.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535099/44_sw6sfb.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535099/43_qbhlvm.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535099/38_ymgyv2.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535098/40_ip137o.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535098/41_cvb3m2.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535097/39_h5fbqi.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535096/37_vzlryn.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535096/36_cfenfa.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535095/35_j4q4ta.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535094/31_eqosxe.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535091/3_qhml0v.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535091/34_lfevxh.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535089/29_klzubh.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535089/32_rbuwy1.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535088/26_ebcmau.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535086/22_g27hrb.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535085/234_t95qws.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535083/25_k5smim.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535083/20_imfk4m.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535079/23_bm18kb.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535078/21_un7rau.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535078/19_kdko3h.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535077/15_edqkt6.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535076/2_m1ou8u.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535076/16_yttr9p.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535072/14_efr1q3.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535072/10_rtjzbx.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535071/18_z2hrxg.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535071/13_gkryx1.png",
  "https://res.cloudinary.com/dgnpa43as/image/upload/v1756535068/11_ejwmaj.png",
];
const postImageUrls = [...new Set(postImageUrlsRaw)]; // Remove duplicates

// --- English & Slang Dummy Post Content ---
const dummyPostData = [
  {
    title: "Insane Alpha",
    description:
      "Shoutout to the OG who dropped this signal. Straight up life-changing gains.",
  },
  {
    title: "1000x Play Came True",
    description:
      "Tossed in some coffee money as a joke. Woke up to this. Still can't believe it. #WAGMI",
  },
  {
    title: "Diamond Hands Paid Off",
    description:
      "They called me crazy for holding. Who's laughing now? Shoutout to the solid analysis.",
  },
  {
    title: "Is This Real Life?",
    description:
      "Had to check my wallet three times. This isn't a dream. Absolutely unreal gains overnight. LFG",
  },
  {
    title: "The Alpha Was A1",
    description:
      "Got the tip, aped in, and now we're here. This is what a real insider call looks like. Massive respect.",
  },
  {
    title: "From Dust to Diamonds",
    description:
      "Started with pocket change, now we're talking serious bags. Never fade the power of memecoins.",
  },
  {
    title: "Secured The Bag",
    description:
      "After holding for what felt like ages, finally took some profits. Feels good. That call was legendary.",
  },
  {
    title: "Hello, Early Retirement",
    description:
      "The dream is now the plan. Life-changing money right here. Huge love to this community for the support.",
  },
  {
    title: "This Tip Was No Joke",
    description:
      "Honestly had my doubts, but the charts don't lie. This was a 100% legit play. Glad I took the risk.",
  },
  {
    title: "Debt-Free Era Begins",
    description:
      "Student loans? GONE. Credit card debt? DELETED. This single play just cleared my slate. Unbelievable feeling.",
  },
  {
    title: "Moon Mission Accomplished",
    description:
      "This memecoin just sent me to the moon and back. From zero to hero in one trade. Unbelievable",
  },
  {
    title: "Jackpot Hit",
    description:
      "Hit the crypto jackpot with this gem. The community was right, this was the play of the year",
  },
  {
    title: "Lambo Money Secured",
    description:
      "Just secured my lambo money with this insane pump. The memecoin gods blessed me today",
  },
  {
    title: "FOMO Paid Off",
    description:
      "Jumped in late but still made bank. Sometimes FOMO is the right move. This community is gold",
  },
  {
    title: "Pepe's Blessing",
    description:
      "Pepe blessed this trade. From a few bucks to life-changing money. Memecoins are the future",
  },
  {
    title: "Doge's Successor",
    description:
      "Found the next Doge before anyone else. This is what early adoption looks like. To the moon",
  },
  {
    title: "Shitcoin to Riches",
    description:
      "Turned a shitcoin into pure gold. The haters said it was impossible. Who's laughing now?",
  },
  {
    title: "Meme Magic is Real",
    description:
      "Meme magic is absolutely real. This community knows how to pump. Thank you for the alpha",
  },
  {
    title: "Whale Alert",
    description:
      "Just became a whale thanks to this play. The feeling is indescribable. WAGMI",
  },
  {
    title: "Rocket Fuel",
    description:
      "This coin had rocket fuel. Went from zero to hero in minutes. The pump was insane",
  },
  {
    title: "Diamond Hands Win",
    description:
      "Held through the dips and now I'm rich. Diamond hands always win in the end",
  },
  {
    title: "Community Power",
    description:
      "The power of this community is unreal. Together we made this happen. LFG",
  },
  {
    title: "Alpha Call Master",
    description:
      "Called this alpha before anyone else. The timing was perfect. This is how you make it",
  },
  {
    title: "Memecoin Millionaire",
    description:
      "Just became a memecoin millionaire. From broke to rich overnight. Dreams do come true",
  },
  {
    title: "Pump and Hold",
    description:
      "Pumped it and held it. The strategy worked perfectly. This is the way",
  },
  {
    title: "Crypto Lottery",
    description:
      "Hit the crypto lottery with this one. Sometimes you just get lucky. Blessed",
  },
  {
    title: "Moon Shot",
    description:
      "Took a moon shot and it paid off. The risk was worth the reward. To infinity and beyond",
  },
  {
    title: "Bag Secured",
    description:
      "Secured the bag before the dump. Perfect timing on this play. Profit taken",
  },
  {
    title: "Fren's Alpha",
    description:
      "Got the alpha from a fren. This is why you stay connected. Community over everything",
  },
  {
    title: "Memecoin Magic",
    description:
      "The magic of memecoins is real. From nothing to something in one trade. Unbelievable",
  },
  {
    title: "Degen Play",
    description:
      "Made a degen play and it worked. Sometimes you just gotta send it. YOLO paid off",
  },
  {
    title: "Crypto Dreams",
    description:
      "Living the crypto dream. This trade changed everything. Thank you to the community",
  },
  {
    title: "Moon Mission",
    description:
      "Mission to the moon accomplished. This memecoin took me there. The journey was worth it",
  },
  {
    title: "Jackpot Season",
    description:
      "It's jackpot season and I'm winning. This play was the highlight. More to come",
  },
  {
    title: "Alpha Hunter",
    description:
      "Hunted the alpha and found gold. This is what separates winners from losers. Stay sharp",
  },
  {
    title: "Memecoin Master",
    description:
      "Mastered the memecoin game. This trade proves it. Knowledge is power",
  },
  {
    title: "Lucky Strike",
    description:
      "Struck gold with this lucky trade. Sometimes timing is everything. Blessed",
  },
  {
    title: "Crypto Blessing",
    description:
      "Received a crypto blessing today. This trade was a gift from above. Grateful",
  },
  {
    title: "Moon Walker",
    description:
      "Walking on the moon thanks to this trade. The feeling is out of this world",
  },
  {
    title: "Bag Builder",
    description:
      "Built the bag of my dreams. This play was the foundation. Building wealth",
  },
  {
    title: "Alpha Finder",
    description:
      "Found the alpha before the crowd. Early bird gets the worm. Timing is key",
  },
  {
    title: "Crypto King",
    description:
      "Feeling like a crypto king today. This trade crowned me. Royal gains",
  },
  {
    title: "Moon Shot Master",
    description:
      "Mastered the moon shot. This trade was textbook perfect. To the stars",
  },
  {
    title: "Jackpot Winner",
    description:
      "Winner winner, jackpot dinner This trade was the meal ticket. Feasting",
  },
  {
    title: "Memecoin Legend",
    description:
      "Becoming a memecoin legend one trade at a time. This was legendary. History made",
  },
  {
    title: "Alpha Legend",
    description:
      "Legendary alpha call. This trade will be remembered. Making history",
  },
  {
    title: "Crypto Hero",
    description:
      "Hero status achieved with this trade. The community made me a hero. Honored",
  },
  {
    title: "Moon Mission Control",
    description:
      "Mission control, we have liftoff This trade launched me to the moon. Success",
  },
  {
    title: "Jackpot Hunter",
    description:
      "Hunted the jackpot and found it. This trade was the perfect hunt. Victory",
  },
  {
    title: "Memecoin Wizard",
    description:
      "Wizard-level trade. The magic was real. This is what mastery looks like",
  },
  {
    title: "Alpha Wizard",
    description:
      "Wizard-level alpha. Called it before anyone else. The crystal ball was clear",
  },
  {
    title: "Crypto Wizard",
    description:
      "Wizard-level crypto gains. This trade was pure magic. Spellbinding profits",
  },
  {
    title: "Moon Wizard",
    description:
      "Wizard-level moon mission. This trade was out of this world. Cosmic gains",
  },
  {
    title: "Jackpot Wizard",
    description:
      "Wizard-level jackpot hit. This trade was pure sorcery. Magical profits",
  },
  {
    title: "Memecoin God",
    description:
      "God-level memecoin trade. This was divine intervention. Blessed beyond measure",
  },
  {
    title: "Alpha God",
    description: "God-level alpha call. This trade was heavenly. Divine timing",
  },
  {
    title: "Crypto God",
    description:
      "God-level crypto gains. This trade was blessed. Divine profits",
  },
  {
    title: "Moon God",
    description:
      "God-level moon mission. This trade was celestial. Heavenly gains",
  },
  {
    title: "Jackpot God",
    description:
      "God-level jackpot hit. This trade was miraculous. Divine intervention",
  },
];

// --- Helper function for random dates ---
function generateRandomDate(start, end) {
  const randomTime =
    start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldDeleteCustom = args.includes("--deleteCustom");
  const shouldDeleteAll = args.includes("--deleteAll");
  const shouldReset = args.includes("--reset");

  console.log("🌱 Starting seed...");

  // Handle delete all data
  if (shouldDeleteAll) {
    console.log("🗑️  Deleting ALL data from database...");
    try {
      // Delete in order to respect foreign key constraints
      await prisma.like.deleteMany({});
      await prisma.comment.deleteMany({});
      await prisma.contentSection.deleteMany({});
      await prisma.post.deleteMany({});
      await prisma.notification.deleteMany({});
      await prisma.user.deleteMany({});

      console.log("✅ All data deleted successfully");
      console.log("📊 Summary:");
      console.log(
        "   - Deleted all users, posts, comments, likes, sections, and notifications"
      );
      console.log("   - Database is now empty");
    } catch (error) {
      console.error("❌ Error deleting all data:", error);
      process.exit(1);
    }
    return;
  }

  // Handle reset database (delete all + seed)
  if (shouldReset) {
    console.log("🔄 Resetting database (delete all + seed)...");
    try {
      // Delete all data first
      await prisma.like.deleteMany({});
      await prisma.comment.deleteMany({});
      await prisma.contentSection.deleteMany({});
      await prisma.post.deleteMany({});
      await prisma.notification.deleteMany({});
      await prisma.user.deleteMany({});

      console.log("✅ All existing data deleted");
      console.log("🌱 Starting fresh seed...");
    } catch (error) {
      console.error("❌ Error resetting database:", error);
      process.exit(1);
    }
  }

  const customUsernames = [
    "Al4n",
    "moneymaykah",
    "Jidn",
    "Bastille",
    "Kai",
    "Staqi",
    "Nach",
    "JIJO",
    "mitch",
    "ShockedJS",
    "Nick",
    "Joji",
    "assasin.eth",
    "Waddles",
    "LEENS",
    "Insentos",
    "meechie",
    "Cooker",
    "daumen.eth",
    "Casino616",
    "POW",
    "Orange",
    "Zrool",
    "NACH",
    "FaZe Lacy",
    "Barsik",
    "UNION",
    "S",
    "Ansem",
    "DV",
    "KREO",
    "GH0STEE",
    "Orangie",
    "Insyider",
    "FaZe Banks",
    "Teige",
    "Frankdegod",
    "Cented",
    "Dior",
    "Euris",
    "Gake",
    "TRAX",
    "qt",
    "Jalen",
    "Terp",
    "profit",
    "Spuno",
    "Polar",
    "Bugha",
    "Admiral",
    "Kev",
    "SolShotta",
    "Cupsey",
  ];

  const uniqueNames = [...new Set(customUsernames)];

  while (uniqueNames.length < profileImageUrls.length) {
    uniqueNames.push(`DummyUser${uniqueNames.length + 1}`);
  }

  if (shouldDeleteCustom) {
    console.log("🗑️  Deleting custom dummy data...");
    try {
      // Delete in order to respect foreign key constraints
      await prisma.like.deleteMany({});
      await prisma.comment.deleteMany({});
      await prisma.contentSection.deleteMany({});
      await prisma.post.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.notification.deleteMany({});

      console.log("✅ Custom dummy data deleted successfully!");
      console.log("📊 Summary:");
      console.log(
        "   - Deleted all users, posts, comments, likes, sections, and notifications"
      );
      console.log("   - Database is now empty");
    } catch (error) {
      console.error("❌ Error deleting custom data:", error);
      process.exit(1);
    }
    return;
  }

  function generateRandomHash() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // --- Phase 1: Create Users and Posts ---
  console.log(
    `\n🌱 Starting Phase 1: Seeding ${profileImageUrls.length} custom users and posts...`
  );
  const createdUserIds = [];
  const createdPosts = [];

  // Define date ranges
  const userStartDate = new Date("2025-03-01T00:00:00.000Z"); // March 1, 2025
  const userEndDate = new Date("2025-04-30T23:59:59.999Z"); // April 30, 2025
  const postStartDate = new Date("2025-08-01T00:00:00.000Z"); // August 1, 2025
  const postEndDate = new Date("2025-08-25T23:59:59.999Z"); // August 25, 2025

  for (let i = 0; i < profileImageUrls.length; i++) {
    const name = uniqueNames[i];
    const profilePicUrl = profileImageUrls[i];

    // --- Generate separate dates for user and post ---
    const userCreationDate = generateRandomDate(userStartDate, userEndDate);
    // Generate post date between July 1 and August 25, 2025
    const postCreationDate = generateRandomDate(postStartDate, postEndDate);

    // Format dates for logging
    const userDateStr = userCreationDate.toISOString().split("T")[0];
    const postDateStr = postCreationDate.toISOString().split("T")[0];

    const postContent = dummyPostData[i % dummyPostData.length];
    const postMedia = postImageUrls[i % postImageUrls.length];

    let userRole;
    if (i === 0) userRole = "god";
    else if (i === 1) userRole = "moderator";
    else if (i === 2) userRole = "mvp";
    else {
      userRole = Math.random() < 0.8 ? "vip" : "member";
    }

    try {
      const sanitizedEmailName = name
        .replace(/[^a-zA-Z0-9]/g, "_")
        .toLowerCase();
      const uniqueEmail = `${sanitizedEmailName}_${crypto
        .randomBytes(4)
        .toString("hex")}@example.com`;

      const user = await prisma.user.create({
        data: {
          username: name,
          email: uniqueEmail,
          profilePic: profilePicUrl,
          bio: `Just a degen navigating the crypto space. WAGMI.`,
          followersCount: Math.floor(Math.random() * 2000),
          followingCount: Math.floor(Math.random() * 500),
          star: Math.random() < 0.6 ? 0 : Math.floor(Math.random() * 3) + 1, // 60% chance 0, 40% chance 1-3
          createdAt: userCreationDate, // Use user creation date
          role: userRole,
        },
      });
      createdUserIds.push(user.userId);
      console.log(
        `✅ Created user: '${user.username}' with role '${user.role}' on ${userDateStr}`
      );

      const newPost = await prisma.post.create({
        data: {
          userId: user.userId,
          title: postContent.title,
          description: postContent.description,
          category: "CRYPTO",
          mediaUrl: postMedia,
          isPublished: true,
          blurred: false,
          viewsCount: Math.floor(Math.random() * 15000) + 1000,
          sharesCount: Math.floor(Math.random() * 500) + 50,
          createdAt: postCreationDate, // Use post creation date
          sections: {
            create: { type: "code", content: generateRandomHash(), order: 1 },
          },
        },
      });
      createdPosts.push(newPost);
      console.log(
        `   └─ Created post '${newPost.title}' for user '${name}' on ${postDateStr}`
      );
    } catch (error) {
      // ... (error handling)
    }
  }

  // --- Phase 2: Create Dummy Likes ---
  console.log(
    `\n🌱 Starting Phase 2: Seeding dummy likes for ${createdPosts.length} posts...`
  );
  for (const post of createdPosts) {
    const likesCount = Math.floor(Math.random() * 25) + 2;
    const likers = new Set();
    const maxLikes = Math.min(likesCount, createdUserIds.length);

    while (likers.size < maxLikes) {
      const randomLikerIndex = Math.floor(
        Math.random() * createdUserIds.length
      );
      likers.add(createdUserIds[randomLikerIndex]);
    }

    for (const likerId of likers) {
      await prisma.like.create({
        data: { postId: post.postId, userId: likerId, likeType: "POST" },
      });
    }

    await prisma.post.update({
      where: { postId: post.postId },
      data: { likesCount: likers.size },
    });
    console.log(`   - Added ${likers.size} likes to post '${post.title}'`);
  }

  console.log("\n🎉 Custom seeding finished!");
  console.log("📊 Summary:");
  console.log(`   - Created Users: ${createdUserIds.length}`);
  console.log(`   - Created Posts: ${createdPosts.length}`);
  console.log("   - To delete this data, run: npm run seed:deleteCustom");
}

main()
  .catch((e) => {
    console.error("❌ Seed script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Database connection closed");
  });
