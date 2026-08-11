export type EraContextTone = "convergence" | "daoism" | "confucianism" | "buddhism";

export interface EraContext {
  tone: EraContextTone;
  titleZh: string;
  titleEn: string;
  quoteZh: string;
  quoteEn: string;
  attributionZh: string;
  attributionEn: string;
  noteZh: string;
  noteEn: string;
  passageSlug: string;
}

/**
 * These are textual resonances for each atlas window, not claims that a passage
 * was composed inside that exact historical window. The source and transmission
 * layer stays visible so the poetic entry point does not flatten chronology.
 */
export const ERA_CONTEXTS: Record<string, EraContext> = {
  all: {
    tone: "convergence",
    titleZh: "三条道路，在同一张时间里相遇",
    titleEn: "Three paths meet within one shared time",
    quoteZh: "三人行，必有我师焉。择其善者而从之，其不善者而改之。",
    quoteEn: "When three walk together, there is surely a teacher for me. I follow what is good and change what is not.",
    attributionZh: "《论语·述而》",
    attributionEn: "Analects, Shu Er",
    noteZh: "交错阅读的起点：把人物、地点与言说放回彼此照见的历史现场。",
    noteEn: "A point of departure for interwoven reading: people, places and speech in mutual view.",
    passageSlug: "three-walk-together",
  },
  origins: {
    tone: "daoism",
    titleZh: "先听天地，再谈人间",
    titleEn: "Listen to earth and heaven before speaking of the human world",
    quoteZh: "人法地，地法天，天法道，道法自然。",
    quoteEn: "Humans follow earth; earth follows heaven; heaven follows the Dao; the Dao follows what is natural.",
    attributionZh: "《道德经》第二十五章",
    attributionEn: "Daodejing, chapter 25",
    noteZh: "神话、传统与哲学的边界在此相邻；坐标与传述各自保留证据层次。",
    noteEn: "Myth, tradition and philosophy sit beside one another here, with evidence layers kept distinct.",
    passageSlug: "humans-follow-earth",
  },
  "pre-qin": {
    tone: "confucianism",
    titleZh: "学问从相遇开始",
    titleEn: "Learning begins in encounter",
    quoteZh: "学而时习之，不亦说乎？",
    quoteEn: "To learn and practise at due times—is that not a pleasure?",
    attributionZh: "《论语·学而》",
    attributionEn: "Analects, Xue Er",
    noteZh: "先秦的思想现场不是一条单线，而是师友、礼制与问答不断交汇。",
    noteEn: "The pre-Qin world is not a single line, but an interchange of teachers, ritual and questions.",
    passageSlug: "learn-and-practice",
  },
  "qin-han": {
    tone: "daoism",
    titleZh: "水行于万物之间",
    titleEn: "Water moves among all things",
    quoteZh: "上善若水。水善利万物而不争。",
    quoteEn: "The highest goodness is like water. Water benefits all things and does not contend.",
    attributionZh: "《道德经》第八章",
    attributionEn: "Daodejing, chapter 8",
    noteZh: "当思想进入帝国交通与地方网络，柔性的语言也沿着道路流动。",
    noteEn: "As ideas enter imperial roads and local networks, a supple language travels with them.",
    passageSlug: "highest-good-like-water",
  },
  "wei-jin": {
    tone: "daoism",
    titleZh: "一进一退，心自见",
    titleEn: "In advancing and receding, the mind becomes visible",
    quoteZh: "为学日益，为道日损。",
    quoteEn: "In learning one increases; in the Dao one decreases.",
    attributionZh: "《道德经》第四十八章",
    attributionEn: "Daodejing, chapter 48",
    noteZh: "乱世与清谈之间，知识的累积和心性的减省形成另一种时间感。",
    noteEn: "Between upheaval and quiet conversation, accumulation and release create another sense of time.",
    passageSlug: "learning-increases-dao-decreases",
  },
  "sui-tang": {
    tone: "buddhism",
    titleZh: "空与色，在译场相逢",
    titleEn: "Form and emptiness meet in the translation halls",
    quoteZh: "色不异空，空不异色。色即是空，空即是色。",
    quoteEn: "Form is not different from emptiness; emptiness is not different from form. Form is emptiness; emptiness is form.",
    attributionZh: "《心经》：隋唐汉译与流通语境",
    attributionEn: "Heart Sutra: Sui–Tang translation and circulation context",
    noteZh: "译经、寺院与长安的制度网络，使远方的教法进入新的汉语声音。",
    noteEn: "Translation, monasteries and Chang’an’s institutions give a distant teaching a new Chinese voice.",
    passageSlug: "form-is-emptiness",
  },
  "song-yuan": {
    tone: "confucianism",
    titleZh: "礼不是旧制，而是当下的自持",
    titleEn: "Ritual is not old form, but present self-restraint",
    quoteZh: "克己复礼为仁。",
    quoteEn: "Conquer the self and return to ritual: this is humaneness.",
    attributionZh: "《论语·颜渊》",
    attributionEn: "Analects, Yan Yuan",
    noteZh: "经典在新的制度与书院之间被重新解释；旧句因此拥有了新的行走路线。",
    noteEn: "Classics are reinterpreted through new institutions and academies; old lines find new routes.",
    passageSlug: "return-to-ritual",
  },
  "ming-qing": {
    tone: "confucianism",
    titleZh: "人与人之间，仍有一条分寸",
    titleEn: "Between people, a measure still remains",
    quoteZh: "己所不欲，勿施于人。",
    quoteEn: "Do not impose on others what you do not desire.",
    attributionZh: "《论语·卫灵公》",
    attributionEn: "Analects, Wei Ling Gong",
    noteZh: "当传播扩大、人物相隔更远，伦理仍从具体关系与彼此体谅开始。",
    noteEn: "As circulation expands and people grow more distant, ethics still begins with relation and regard.",
    passageSlug: "do-not-impose",
  },
  modern: {
    tone: "convergence",
    titleZh: "旧句重新进入今天",
    titleEn: "An old line enters the present again",
    quoteZh: "道可道，非常道；名可名，非常名。",
    quoteEn: "A Dao that can be spoken is not the constant Dao; a name that can be named is not the constant name.",
    attributionZh: "《道德经》第一章 · 后世重读",
    attributionEn: "Daodejing, chapter 1 · later rereading",
    noteZh: "近现代不是终点，而是重新命名、重新定位、重新相遇的入口。",
    noteEn: "The modern period is not an ending, but an entry into renaming, relocating and meeting again.",
    passageSlug: "dao-that-can-be-spoken",
  },
};
