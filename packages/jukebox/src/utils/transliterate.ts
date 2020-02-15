import pinyin from "pinyin";
import nodejieba from "nodejieba";
import MeCab from "mecab-async";

/** List of commonly used characters that is only used in Japanese */
const jaOnly = /[ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ゛゜ゝゞゟ゠ーｰ𛀁𛀂𛀃𛀄𛀅𛀆𛀇𛀈𛀉𛀊𛀋𛀌𛀍𛀎𛀏𛀐𛀑𛀒𛀓𛀔𛀕𛀖𛀗𛀘𛀙𛀚𛀛𛀜𛀝𛀞𛀟𛀠𛀡𛀢𛀣𛀤𛀥𛀦𛀧𛀨𛀩𛀪𛀫𛀬𛀭𛀮𛀯𛀰𛀱𛀲𛀳𛀴𛀵𛀶𛀷𛀸𛀹𛀺𛀻𛀼𛀽𛀾𛀿𛁀𛁁𛁂𛁃𛁄𛁅𛁆𛁇𛁈𛁉𛁊𛁋𛁌𛁍𛁎𛁏𛁐𛁑𛁒𛁓𛁔𛁕𛁖𛁗𛁘𛁙𛁚𛁛𛁜𛁝𛁞𛁟𛁠𛁡𛁢𛁣𛁤𛁥𛁦𛁧𛁨𛁩𛁪𛁫𛁬𛁭𛁮𛁯𛁰𛁱𛁲𛁳𛁴𛁵𛁶𛁷𛁸𛁹𛁺𛁻𛁼𛁽𛁾𛁿𛂀𛂁𛂂𛂃𛂄𛂅𛂆𛂇𛂈𛂉𛂊𛂋𛂌𛂍𛂎𛂏𛂐𛂑𛂒𛂓𛂔𛂕𛂖𛂗𛂘𛂙𛂚𛂛𛂜𛂝𛂞𛂟𛂠𛂡𛂢𛂣𛂤𛂥𛂦𛂧𛂨𛂩𛂪𛂫𛂬𛂭𛂮𛂯𛂰𛂱𛂲𛂳𛂴𛂵𛂶𛂷𛂸𛂹𛂺𛂻𛂼𛂽𛂾𛂿𛃀𛃁𛃂𛃃𛃄𛃅𛃆𛃇𛃈𛃉𛃊𛃋𛃌𛃍𛃎𛃏𛃐𛃑𛃒𛃓𛃔𛃕𛃖𛃗𛃘𛃙𛃚𛃛𛃜𛃝𛃞𛃟𛃠𛃡𛃢𛃣𛃤𛃥𛃦𛃧𛃨𛃩𛃪𛃫𛃬𛃭𛃮𛃯𛃰𛃱𛃲𛃳𛃴𛃵𛃶𛃷𛃸𛃹𛃺𛃻𛃼𛃽𛃾𛃿𛄀𛄁𛄂𛄃𛄄𛄅𛄆𛄇𛄈𛄉𛄊𛄋𛄌𛄍𛄎𛄏𛄐𛄑𛄒𛄓𛄔𛄕𛄖𛄗𛄘𛄙𛄚𛄛𛄜𛄝𛄞���🈀〱〲〳〴〵゛゜゠ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶヷヸヹヺ・ーヽヾヿㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ㋐㋑㋒㋓㋔㋕㋖㋗㋘㋙㋚㋛㋜㋝㋞㋟㋠㋡㋢㋣㋤㋥㋦㋧㋨㋩㋪㋫㋬㋭㋮㋯㋰㋱㋲㋳㋴㋵㋶㋷㋸㋹㋺㋻㋼㋽㋾･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ𛀀����㌀㌁㌂㌃㌄㌅㌆㌇㌈㌉㌊㌋㌌㌍㌎㌏㌐㌑㌒㌓㌔㌕㌖㌗㌘㌙㌚㌛㌜㌝㌞㌟㌠㌡㌢㌣㌤㌥㌦㌧㌨㌩㌪㌫㌬㌭㌮㌯㌰㌱㌲㌳㌴㌵㌶㌷㌸㌹㌺㌻㌼㌽㌾㌿㍀㍁㍂㍃㍄㍅㍆㍇㍈㍉㍊㍋㍌㍍㍎㍏㍐㍑㍒㍓㍔㍕㍖㍗㍻㍼㍽㍾㍿増楽薬霊塡犠渓著雑祖猟槇祉栄畳福込帰朗鉱獣砕呉響碑捗僧繊粋瀬繁層厳隠変頬剰拠剤斎専琢廃匂巣転黒社舗蔵伝歩鋳餠愼験抜読猪廊郞曽仮駅譲欄酔桟済気斉囲択経乗満穀難錬嘆戻醸虜寛銭様歳毎奨艶帯侮挙逸署器両釈節墨挿従権憎嬢都倹豊戦庁謁卑歓駆観揺徴悪徳壌団暑営娯弾渇恵祝縁枠勤隣対漢謹検卽摂類視発緖壊拡粛掲涙穏総圏拝沢贈圧浄顔仏図陥歴亀壱梅眞煮闘髪円扱塩騒懐覚敏軽峠戸頼荘黙晩諸継蛍遅逓祥練喩応悩姫険齢撃聴覧痩値鉄禍塀続勉臭鶏辺縄悔絵郷捜懲者鬪海児実薫亜渚歯駄渋弐広姉巻剣証塁単顕価禎祐突穂暦払栃訳渉県労麺糸焼勲神舎縦賓髄丼暁桜滝脳稲勧鎭祈売]/;
/** Test the string if has Han characters */
const isHan = /[\u4E00-\u9FA5\u9FA6-\u9FEF\u3400-\u4DB5\u{20000}-\u{2A6D6}\u{2A700}-\u{2B734}\u{2B740}-\u{2B81D}\u{2B820}-\u{2CEA1}\u{2CEB0}-\u{2EBE0}\u2F00-\u2FD5\u2E80-\u2EF3\uF900-\uFAD9\u{2F800}-\u{2FA1D}\uE815-\uE86F\uE400-\uE5E8\uE600-\uE6CF\u31C0-\u31E3\u2FF0-\u2FFB\u3105-\u312F\u31A0-\u31BA\u3007]/u;

const mecab = new MeCab();
mecab.command = "mecab -d /usr/local/lib/mecab/dic/mecab-ipadic-neologd --node-format=\"%M\t%H\n\" --unk-format=\"%M\t%H\n\"";
mecab.parser = function (data) {
  return {
    kanji: data[0],
    lexical: data[1] || "",
    compound: data[2] || "",
    compound2: data[3] || "",
    compound3: data[4] || "",
    conjugation: data[5] || "",
    inflection: data[6] || "",
    original: data[7] || "",
    reading: data[8] || "",
    pronunciation: data[9] || ""
  };
};

/**
 * Convert katakana to hiragana.
 * @param str katakana
 */
function kanaToHira(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g,
    match => String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

export function transliterate(text: string): string {
  if (jaOnly.test(text)) {
    // transliterate as ja
    const words = mecab.parseSyncFormat(text);
    return words.map(x => {
      if (jaOnly.test(x.kanji) || isHan.test(x.kanji)) {
        const prefix = x.kanji.substr(0, x.kanji.indexOf(x.original));
        return prefix + kanaToHira(x.reading || x.kanji);
      }
      return x.kanji;
    }).join("");
  } else if (isHan.test(text)) {
    // transliterate as zh
    const words: string[] = nodejieba.cut(text);
    return words.map(
      word => pinyin(word, { segment: true, heteronym: true }).map(x => x[0]).join("")
    ).join(" ");
  } else {
    // No asian text found
    return text;
  }
}
