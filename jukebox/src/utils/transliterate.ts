import pinyin from "pinyin";
import nodejieba from "nodejieba";
import MeCab from "mecab-async";

/** List of commonly used characters that is only used in Japanese */
const jaOnly = /[〱〲〳〴〵゛゜゠ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶヷヸヹヺ・ーヽヾヿㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ㋐㋑㋒㋓㋔㋕㋖㋗㋘㋙㋚㋛㋜㋝㋞㋟㋠㋡㋢㋣㋤㋥㋦㋧㋨㋩㋪㋫㋬㋭㋮㋯㋰㋱㋲㋳㋴㋵㋶㋷㋸㋹㋺㋻㋼㋽㋾･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ𛀀����㌀㌁㌂㌃㌄㌅㌆㌇㌈㌉㌊㌋㌌㌍㌎㌏㌐㌑㌒㌓㌔㌕㌖㌗㌘㌙㌚㌛㌜㌝㌞㌟㌠㌡㌢㌣㌤㌥㌦㌧㌨㌩㌪㌫㌬㌭㌮㌯㌰㌱㌲㌳㌴㌵㌶㌷㌸㌹㌺㌻㌼㌽㌾㌿㍀㍁㍂㍃㍄㍅㍆㍇㍈㍉㍊㍋㍌㍍㍎㍏㍐㍑㍒㍓㍔㍕㍖㍗㍻㍼㍽㍾㍿増楽薬霊塡犠渓著雑祖猟槇祉栄畳福込帰朗鉱獣砕呉響碑捗僧繊粋瀬繁層厳隠変頬剰拠剤斎専琢廃匂巣転黒社舗蔵伝歩鋳餠愼験抜読猪廊郞曽仮駅譲欄酔桟済気斉囲択経乗満穀難錬嘆戻醸虜寛銭様歳毎奨艶帯侮挙逸署器両釈節墨挿従権憎嬢都倹豊戦庁謁卑歓駆観揺徴悪徳壌団暑営娯弾渇恵祝縁枠勤隣対漢謹検卽摂類視発緖壊拡粛掲涙穏総圏拝沢贈圧浄顔仏図陥歴亀壱梅眞煮闘髪円扱塩騒懐覚敏軽峠戸頼荘黙晩諸継蛍遅逓祥練喩応悩姫険齢撃聴覧痩値鉄禍塀続勉臭鶏辺縄悔絵郷捜懲者鬪海児実薫亜渚歯駄渋弐広姉巻剣証塁単顕価禎祐突穂暦払栃訳渉県労麺糸焼勲神舎縦賓髄丼暁桜滝脳稲勧鎭祈売]/;
/** Test the string if has Han characters */
const isHan = /[\u4E00-\u9FA5\u9FA6-\u9FEF\u3400-\u4DB5\u{20000}-\u{2A6D6}\u{2A700}-\u{2B734}\u{2B740}-\u{2B81D}\u{2B820}-\u{2CEA1}\u{2CEB0}-\u{2EBE0}\u2F00-\u2FD5\u2E80-\u2EF3\uF900-\uFAD9\u{2F800}-\u{2FA1D}\uE815-\uE86F\uE400-\uE5E8\uE600-\uE6CF\u31C0-\u31E3\u2FF0-\u2FFB\u3105-\u312F\u31A0-\u31BA\u3007]/u;

const mecab = new MeCab();
mecab.command = "mecab -d /usr/local/lib/mecab/dic/mecab-ipadic-neologd --node-format=\"%M\t%H\n\" --unk-format=\"%M\t%H\n\"";

export function transliterate(text: string): string {
  if (jaOnly.test(text)) {
    // transliterate as ja
    const words = mecab.parseFormatSync(text);
    return words.map(x => x.reading || x.original).join("");
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
