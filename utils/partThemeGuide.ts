const THEME_GUIDES: Array<[RegExp, string]> = [
  [/人称代名詞①（主格）/, 'Target: subject pronouns such as "I", "you", "he", "she", "it", "we", "they". A full noun subject can be correct English, but if it avoids the target pronoun, accept the meaning and remind the learner to practice the subject pronoun in the reference answer.'],
  [/人称代名詞②（所有格）/, 'Target: possessive pronouns/adjectives before nouns such as "my", "your", "his", "her", "its", "our", "their". A noun possessive such as "the dog\'s" is correct English, but it is not this Part Theme. Do not praise it as the target possessive-pronoun usage; accept correct meaning and remind the learner to practice the reference form, especially "its" for animals/things.'],
  [/人称代名詞③（目的格）/, 'Target: object pronouns such as "me", "you", "him", "her", "it", "us", "them". A full noun object can be correct English, but if it avoids the target object pronoun, accept the meaning and remind the learner to practice the object pronoun in the reference answer.'],
  [/人称代名詞④（独立所有格）/, 'Target: independent possessive pronouns such as "mine", "yours", "his", "hers", "ours", "theirs". A possessive adjective plus noun, such as "my book", may be correct English but is not this Part Theme when the reference uses "mine".'],
  [/this \/ that/, 'Target: choosing "this" for something near the speaker and "that" for something farther away. Do not treat plural forms "these/those" as the same pattern.'],
  [/these \/ those/, 'Target: plural demonstratives "these" and "those". Singular "this/that" may show a number mismatch and should not be described as the same target pattern.'],
  [/be動詞/, 'Target: be-verb sentence structure using "am", "is", or "are". If the learner uses a different natural structure with a general verb, accept only if the meaning truly matches, then remind them to practice the be-verb pattern.'],
  [/一般動詞/, 'Target: general-verb sentence structure. Do not praise a be-verb paraphrase as practicing this Part Theme unless the reference pattern is still preserved.'],
  [/can/, 'Target: ability/permission with "can" plus base verb. A paraphrase with "be able to" can be correct English, but it is a different pattern; accept correct meaning and remind the learner to practice "can".'],
  [/be able to/, 'Target: "be able to" plus base verb. A paraphrase with "can" can be correct English, but it is a different pattern; accept correct meaning and remind the learner to practice "be able to".'],
  [/be going to/, 'Target: future plan/intention with "be going to". A "will" answer may be correct future meaning, but it is not this Part Theme when the reference practices "be going to".'],
  [/will①/, 'Target: future prediction/simple future with "will". Do not merge it with "be going to" unless the explanation says the reference pattern is "will".'],
  [/will②/, 'Target: will for intention or decision. Distinguish it from "be going to" for planned future and from simple future prediction.'],
  [/will③|shall/, 'Target: requests with "will" and offers/invitations with "shall". Distinguish request/offer use from ordinary future "will".'],
  [/SVO \+ to \/ for/, 'Target: SVO plus "to" or "for", such as "give A to B" or "make A for B". SVOO may have the same meaning, but it is a different pattern; accept correct meaning and remind them to practice the to/for form.'],
  [/SVOO/, 'Target: SVOO double-object structure, such as "give me a pen". The "to/for" version may be correct English, but it is a different pattern; accept correct meaning and remind them to practice SVOO.'],
  [/不定詞①/, 'Target: noun use of the to-infinitive, where "to + verb" acts like a noun. Do not describe gerunds or purpose infinitives as the same target.'],
  [/不定詞②/, 'Target: adverbial to-infinitive for purpose, meaning "in order to". Distinguish it from noun use and adjective use.'],
  [/不定詞③/, 'Target: adverbial to-infinitive for reason/cause. Distinguish it from purpose and adjective use.'],
  [/不定詞④/, 'Target: adjective use of the to-infinitive modifying a noun, such as "something to drink". Distinguish it from noun or purpose use.'],
  [/It is ～ to ～/, 'Target: "It is + adjective/noun + to + verb" structure. A normal subject sentence can be correct English, but it is not the target dummy-it pattern.'],
  [/動名詞/, 'Target: gerund "-ing" used as a noun. A to-infinitive can sometimes be correct English, but it is a different pattern; accept correct meaning and remind them to practice the gerund if needed.'],
  [/現在進行形/, 'Target: "be + -ing" for an action happening now or around now. Do not merge it with simple present.'],
  [/過去進行形/, 'Target: "was/were + -ing" for an action in progress in the past. Do not merge it with simple past.'],
  [/過去形/, 'Target: simple past form. Do not merge it with present perfect or past progressive.'],
  [/現在完了①/, 'Target: present perfect experience using "have/has + past participle", often with "ever/never/before". Distinguish it from completion or continuation.'],
  [/現在完了②/, 'Target: present perfect completion/result using "have/has + past participle", often with "just/already/yet". Distinguish it from experience or continuation.'],
  [/現在完了③/, 'Target: present perfect continuation using "have/has + past participle" with "for/since". Distinguish it from present perfect progressive.'],
  [/現在完了進行形/, 'Target: "have/has been + -ing" for an ongoing action. Distinguish it from present perfect continuation using a stative verb.'],
  [/原級比較/, 'Target: "as + adjective/adverb + as". Do not merge it with comparative "-er/more" or superlative "-est/most".'],
  [/比較級（～er）/, 'Target: comparative adjective with "-er". Do not merge it with "more" comparatives unless the adjective requires more.'],
  [/比較級（more）/, 'Target: comparative adjective with "more". Do not merge it with "-er" comparatives unless the adjective requires -er.'],
  [/最上級（～est）/, 'Target: superlative adjective with "-est". Do not merge it with "most" superlatives unless the adjective requires most.'],
  [/最上級（most）/, 'Target: superlative adjective with "most". Do not merge it with "-est" superlatives unless the adjective requires -est.'],
  [/副詞の比較級/, 'Target: adverb comparative, such as "faster" or "more slowly". Distinguish it from adjective comparison.'],
  [/副詞の最上級/, 'Target: adverb superlative, such as "the fastest" or "the most slowly". Distinguish it from adjective superlative.'],
  [/受け身/, 'Target: passive voice with "be + past participle". An active sentence can be correct meaning in some contexts, but it is not the passive pattern.'],
  [/SVOC/, 'Target: SVOC structure where the object has a complement, such as "make me happy" or "call him Ken". Distinguish it from simple SVO.'],
  [/SVC/, 'Target: SVC structure with a complement after linking verbs, such as "be", "look", "become". Distinguish it from SVO.'],
  [/SVO \+ to不定詞/, 'Target: SVO + to-infinitive, such as "tell/ask/want someone to do". Distinguish it from SVOO or simple infinitive use.'],
  [/原形不定詞①/, 'Target: perception verb plus object plus base verb, such as "see/hear someone do". Distinguish it from to-infinitive and -ing participle forms.'],
  [/原形不定詞②/, 'Target: causative verb plus object plus base verb, such as "make/let/have someone do". Distinguish it from to-infinitive forms.'],
  [/間接疑問文/, 'Target: embedded question with statement word order, such as "I know where he lives". Do not use direct-question word order after the question word.'],
  [/現在分詞で名詞を修飾/, 'Target: present participle "-ing" modifying a noun, such as "the boy running there". Distinguish it from a relative clause if the reference practices the participle form.'],
  [/過去分詞で名詞を修飾/, 'Target: past participle modifying a noun, such as "the language spoken here". Distinguish it from a relative clause or passive sentence if the reference practices the participle modifier.'],
  [/関係代名詞①/, 'Target: subject relative pronoun for people, usually "who/that". Distinguish it from object relative pronouns and from "which" for non-people.'],
  [/関係代名詞②/, 'Target: subject relative pronoun for things/animals, usually "which/that". Distinguish it from "who" for people and object relative pronouns.'],
  [/関係代名詞③/, 'Target: object relative pronoun for people, such as "who/whom/that". Distinguish it from subject relative pronouns.'],
  [/関係代名詞④/, 'Target: object relative pronoun for things/animals, such as "which/that". Distinguish it from subject relative pronouns.'],
  [/関係代名詞⑤/, 'Target: relative "whose" meaning possession. Do not replace it with unrelated possessive structures without noting the Part Theme.'],
  [/関係代名詞⑥/, 'Target: relative "what" meaning "the thing(s) that". Do not treat ordinary question "what" as the same pattern.'],
  [/関係副詞①/, 'Target: relative adverb "where" for place. Distinguish it from relative pronoun structures such as "which ... in".'],
  [/関係副詞②/, 'Target: relative adverb "when" for time. Distinguish it from relative pronoun structures such as "which ... on".'],
  [/too ～ to ～/, 'Target: "too + adjective/adverb + to + verb" meaning too ... to do. Do not merge it with "so ... that" or "enough to".'],
  [/enough to/, 'Target: "adjective/adverb + enough to + verb". Do not merge it with "too ... to" or "so ... that".'],
  [/so ～ that/, 'Target: "so + adjective/adverb + that + clause". Do not merge it with "too ... to" or "enough to".'],
];

export function createPartThemeGuide(partTitle?: string | null): string {
  if (!partTitle) {
    return 'Use the reference answer as the exact target grammar pattern. If a learner gives a correct paraphrase that avoids the pattern, keep the score correct but add a short reminder to practice the reference pattern.';
  }

  const matched = THEME_GUIDES
    .filter(([pattern]) => pattern.test(partTitle))
    .map(([, guide]) => guide);

  return [
    `Current Part Title: ${partTitle}`,
    ...matched,
    'General rule: do not collapse the Part Theme into a broader nearby grammar label. If the learner uses a correct and natural paraphrase with a different structure, keep it correct when the meaning matches, but explain that the reference answer is the form to practice in this Part.',
  ].join('\n');
}

const normalizeEnglish = (text: string) =>
  text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasWord = (text: string, word: string) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);

const hasAnyWord = (text: string, words: string[]) => words.some((word) => hasWord(text, word));

const quote = (text: string) => `"${text.trim()}"`;

const getWordsPresent = (text: string, words: string[]) =>
  words.filter((word) => hasWord(text, word));

const SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK =
  '英文として自然で、意味も正しく伝わっています。このPartでは正解例の形も練習してみましょう。';

export function createDeterministicThemeFeedback(params: {
  partTitle?: string | null;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}): string | null {
  const { partTitle, correctAnswer, userAnswer, isCorrect } = params;
  if (!isCorrect || !partTitle || !correctAnswer || !userAnswer) return null;

  const normalizedUser = normalizeEnglish(userAnswer);
  const normalizedCorrect = normalizeEnglish(correctAnswer);
  const userText = userAnswer.trim();
  const correctText = correctAnswer.trim();

  if (/人称代名詞②（所有格）/.test(partTitle)) {
    const possessivePronouns = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
    const targetPronouns = getWordsPresent(normalizedCorrect, possessivePronouns);
    const userUsesTargetPronoun = targetPronouns.some((word) => hasWord(normalizedUser, word));
    const userUsesNounPossessive = /\b(?:the\s+|a\s+|an\s+)?[a-z]+(?:'s|s')\b/i.test(normalizedUser);

    if (targetPronouns.length > 0 && !userUsesTargetPronoun && userUsesNounPossessive) {
      return SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK;
    }
  }

  if (/人称代名詞①（主格）/.test(partTitle)) {
    const subjectPronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they'];
    const targetPronouns = getWordsPresent(normalizedCorrect, subjectPronouns);
    if (targetPronouns.length > 0 && !hasAnyWord(normalizedUser, targetPronouns)) {
      return SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK;
    }
  }

  if (/人称代名詞③（目的格）/.test(partTitle)) {
    const objectPronouns = ['me', 'you', 'him', 'her', 'it', 'us', 'them'];
    const targetPronouns = getWordsPresent(normalizedCorrect, objectPronouns);
    if (targetPronouns.length > 0 && !hasAnyWord(normalizedUser, targetPronouns)) {
      return SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK;
    }
  }

  if (/人称代名詞④（独立所有格）/.test(partTitle)) {
    const independentPossessives = ['mine', 'yours', 'his', 'hers', 'ours', 'theirs'];
    const targetPronouns = getWordsPresent(normalizedCorrect, independentPossessives);
    if (targetPronouns.length > 0 && !hasAnyWord(normalizedUser, targetPronouns)) {
      return SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK;
    }
  }

  if (/be going to/.test(partTitle) && /\bbe going to\b/i.test(normalizedCorrect) && !/\bbe going to\b/i.test(normalizedUser)) {
    return SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK;
  }

  if (/be able to/.test(partTitle) && /\bbe able to\b/i.test(normalizedCorrect) && !/\bbe able to\b/i.test(normalizedUser)) {
    return SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK;
  }

  if (/\bcan\b/i.test(partTitle) && hasWord(normalizedCorrect, 'can') && !hasWord(normalizedUser, 'can')) {
    return SAFE_CORRECT_DIFFERENT_THEME_FEEDBACK;
  }

  return null;
}
