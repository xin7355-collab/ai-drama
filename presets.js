/* AI 劇本工坊範本庫：角色原型、服裝、場景、道具、畫風、故事類型、外觀錨點選單。
   只有資料與組字函式、不碰 DOM，所以瀏覽器（window.DramaPresets）與 Node 測試共用同一份。
   英文描述是給生圖／生影片模型讀的，用模型訓練時常見的詞彙寫，不是中文直譯；
   外觀錨點都帶一個「一眼認得」的身體特徵，因為服裝會換、臉上的痣和疤不會，換裝後才認得出是同一人。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DramaPresets = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  /* ---------- 服裝：寫顏色＋材質＋款式，模型才不會每鏡換一件 ---------- */

  const OUTFITS = [
    { g: '現代日常', items: [
      { name: '白T牛仔褲', prompt: 'plain white crew-neck cotton T-shirt, light-wash straight-leg jeans, white canvas sneakers' },
      { name: '寬鬆連帽衫', prompt: 'oversized heather-grey cotton hoodie, black joggers, chunky white sneakers' },
      { name: '米白針織衫', prompt: 'cream cable-knit wool sweater, camel wide-leg trousers, brown loafers' },
      { name: '碎花洋裝', prompt: 'pale blue floral midi dress with short puff sleeves, thin white cardigan, white flats' },
      { name: '牛仔外套', prompt: 'faded denim jacket over a navy-and-white striped Breton top, black skinny jeans' },
      { name: '卡其風衣', prompt: 'beige double-breasted belted trench coat over a black turtleneck, dark trousers, ankle boots' },
      { name: '黑色皮衣', prompt: 'black leather biker jacket, white tee, ripped black jeans, scuffed combat boots' },
      { name: '格紋襯衫', prompt: 'red-and-black flannel shirt worn open over a grey tee, olive cargo pants' },
      { name: '居家睡衣', prompt: 'loose pastel-pink cotton pajama set with white piping, fluffy slippers' },
      { name: '運動服', prompt: 'navy track jacket with two white stripes on the sleeves, matching track pants, running shoes' },
      { name: '黃色雨衣', prompt: 'translucent yellow hooded raincoat over casual clothes, rain boots' },
      { name: '舊外套', prompt: 'worn olive-green parka with frayed cuffs, faded grey sweatpants, old sneakers' },
    ] },
    { g: '職場', items: [
      { name: '黑色三件式西裝', prompt: 'tailored charcoal-black three-piece suit, crisp white shirt, dark navy silk tie, polished black oxfords' },
      { name: '駝色長大衣', prompt: 'long camel cashmere overcoat over a slim black suit, black turtleneck' },
      { name: '西裝套裙', prompt: 'navy fitted blazer and knee-length pencil skirt, ivory silk blouse, low black heels' },
      { name: '白襯衫西褲', prompt: 'white slim-fit shirt with rolled sleeves, grey slacks, staff ID badge on a lanyard' },
      { name: '實習生', prompt: 'light blue oxford shirt, beige chinos, plain black backpack, staff ID lanyard' },
      { name: '醫師白袍', prompt: 'white knee-length doctor\'s coat over teal scrubs, stethoscope around the neck, name badge' },
      { name: '護理師', prompt: 'light blue nurse scrubs, white nursing shoes, hair tied back, pen in the chest pocket' },
      { name: '刑警便衣', prompt: 'dark navy windbreaker over a grey henley, dark jeans, police badge clipped to the belt' },
      { name: '律師袍', prompt: 'black court robe with white trim worn over a dark suit, leather document folder' },
      { name: '廚師服', prompt: 'white double-breasted chef jacket, black waist apron, black chef trousers' },
      { name: '外送員', prompt: 'bright orange delivery jacket with reflective strips, black helmet, square insulated delivery backpack' },
      { name: '超商店員', prompt: 'green and white store vest over a white polo shirt, name tag on the chest' },
      { name: '空服員', prompt: 'navy flight attendant uniform with a fitted jacket, red silk neck scarf, small wing pin' },
      { name: '咖啡師', prompt: 'black canvas apron over a white button-up shirt, sleeves rolled to the elbow' },
      { name: '實驗袍', prompt: 'white lab coat over a black turtleneck, safety goggles pushed up on the head, ID card clipped on' },
    ] },
    { g: '校園', items: [
      { name: '高中制服（裙）', prompt: 'white short-sleeve school blouse with an embroidered name on the chest, navy pleated knee-length skirt, white socks, black school shoes' },
      { name: '高中制服（褲）', prompt: 'white short-sleeve school shirt with an embroidered name on the chest, navy trousers, black school shoes' },
      { name: '體育服', prompt: 'white school PE T-shirt with navy trim, navy athletic shorts, white sneakers' },
      { name: '大學生', prompt: 'navy varsity jacket with cream sleeves, white tee, light jeans, canvas tote bag' },
      { name: '學士服', prompt: 'black graduation gown with a colored hood, black square academic cap' },
    ] },
    { g: '正式禮服', items: [
      { name: '綠色緞面晚禮服', prompt: 'floor-length emerald green satin evening gown with thin straps, diamond drop earrings' },
      { name: '黑色燕尾服', prompt: 'black tuxedo with satin peak lapels, white wing-collar shirt, black bow tie' },
      { name: '白色婚紗', prompt: 'ivory lace long-sleeve wedding gown, cathedral-length veil' },
      { name: '紅色旗袍', prompt: 'fitted crimson silk qipao with a mandarin collar and gold frog buttons, knee length' },
      { name: '黑色喪服', prompt: 'plain black long-sleeve mourning dress, small white flower pinned on the chest' },
      { name: '香檳色小禮服', prompt: 'champagne sequined cocktail dress, knee length, nude heels, small clutch bag' },
    ] },
    { g: '古裝宮廷', items: [
      { name: '皇后華服', prompt: 'layered crimson and gold imperial court robes with phoenix embroidery, ornate gold phoenix hairpins' },
      { name: '龍袍', prompt: 'bright yellow emperor\'s robe embroidered with golden dragons, jade belt, black court crown' },
      { name: '王爺常服', prompt: 'dark indigo brocade robe with silver cloud patterns, black jade belt, silver hair crown' },
      { name: '大家閨秀', prompt: 'pale pink layered Hanfu with wide sleeves, embroidered waist sash, single pearl hairpin' },
      { name: '庶女素衣', prompt: 'plain faded light-blue cotton Hanfu, simple wooden hairpin, no jewelry' },
      { name: '宮女服', prompt: 'pale green palace maid robe with a white collar, hair in twin buns' },
      { name: '書生袍', prompt: 'plain light-blue scholar\'s robe, black cloth head wrap, cloth book bag' },
      { name: '將軍鎧甲', prompt: 'dark steel lamellar general\'s armour with shoulder guards, flowing red cape' },
      { name: '夜行衣', prompt: 'black close-fitting night-raid outfit, black cloth face mask, wrapped forearms' },
      { name: '粗布衣', prompt: 'coarse undyed linen peasant clothes patched at the elbows, straw sandals' },
    ] },
    { g: '仙俠奇幻', items: [
      { name: '白衣仙袍', prompt: 'flowing white layered immortal robes with silver cloud embroidery, white jade hair crown' },
      { name: '魔尊黑袍', prompt: 'black and dark red layered robes with gold trim and a high collar, black metal hair crown' },
      { name: '宗門弟子', prompt: 'light blue sect disciple robe with a white sash, sword in a plain scabbard at the hip' },
      { name: '狐妖紅衣', prompt: 'flowing red silk robes with fox-fur trim at the collar, red tassel earrings' },
      { name: '巫師長袍', prompt: 'deep purple hooded wizard robe with silver star embroidery, leather belt with pouches' },
    ] },
    { g: '民國年代', items: [
      { name: '民國女學生', prompt: '1920s Chinese student uniform: pale blue cotton blouse with wide sleeves, black knee-length skirt, black cloth shoes' },
      { name: '長衫', prompt: 'dark grey changshan long gown, round wire spectacles, black cloth shoes' },
      { name: '軍官制服', prompt: 'olive 1930s military officer uniform with a peaked cap, Sam Browne belt, tall leather boots' },
      { name: '舞廳旗袍', prompt: 'sleeveless black velvet qipao with silver embroidery, long pearl necklace, finger-waved hair' },
    ] },
    { g: '科幻未來', items: [
      { name: '太空服', prompt: 'white and orange spacesuit with mission patches, helmet held under one arm' },
      { name: '戰術裝', prompt: 'black tactical vest over a dark long-sleeve shirt, cargo pants, fingerless gloves, combat boots' },
      { name: '賽博龐克', prompt: 'black techwear jacket with glowing cyan seams, translucent visor, cargo straps' },
      { name: '白色連身衣', prompt: 'seamless white bodysuit with thin light-grey panel lines, minimalist futuristic design' },
    ] },
  ];

  /* ---------- 角色原型：外觀錨點彼此要一眼分得出來（髮型、輪廓、一個標記） ---------- */

  const CHARACTERS = [
    { g: '都市愛情', items: [
      { t: '霸道總裁', name: '陸以衡', role: '主角', age: '32', gender: '男', job: '集團執行長',
        personality: '冷靜、控制欲強、嘴硬心軟', desire: '守住家族集團的掌控權', fear: '再被最信任的人背叛', secret: '十年前的車禍與女主有關',
        arc: '從只信利益到願意為一個人放下權力', speech: '句子短、不解釋、常用命令句',
        appearance: 'a 32-year-old East Asian man, sharp angular jawline, short black hair neatly slicked back, tall broad-shouldered build, a small mole on the left side of his neck',
        outfits: ['黑色三件式西裝', '駝色長大衣'], voice: '低沉、語速慢、句尾下壓' },
      { t: '灰姑娘女主', name: '許知夏', role: '主角', age: '24', gender: '女', job: '咖啡店店員兼設計系夜校生',
        personality: '倔強、樂觀、吃軟不吃硬', desire: '存夠錢讓媽媽動手術', fear: '欠別人人情', secret: '是豪門當年抱錯的真千金',
        arc: '從只想撐過今天到為自己爭取位置', speech: '講話快、會自嘲、緊張時重複對方的話',
        appearance: 'a 24-year-old East Asian woman, round face, large dark brown eyes, chest-length dark brown hair in a low ponytail, petite build, deep dimples on both cheeks',
        outfits: ['咖啡師', '碎花洋裝'], voice: '清亮、語速偏快、笑起來尾音上揚' },
      { t: '千金反派女配', name: '沈曼妮', role: '反派', age: '26', gender: '女', job: '集團千金、時尚品牌主理人',
        personality: '驕傲、聰明、嫉妒心重', desire: '嫁進陸家', fear: '被發現自己是假千金', secret: '當年是她的家人調包了嬰兒',
        arc: '從掠奪到被自己的謊言反噬', speech: '慢條斯理、笑著講狠話、愛用敬稱',
        appearance: 'a 26-year-old East Asian woman, sleek waist-length black hair with blunt bangs, sharp cat-eye makeup, tall slim build, a single diamond stud in her right ear',
        outfits: ['綠色緞面晚禮服', '西裝套裙'], voice: '甜中帶冷、咬字清楚' },
      { t: '溫柔男二', name: '程予安', role: '配角', age: '29', gender: '男', job: '小兒科醫師',
        personality: '溫和、體貼、總是退一步', desire: '保護女主不受傷', fear: '自己永遠只是備胎', secret: '默默幫女主付過醫藥費',
        arc: '從暗中守護到學會說出口', speech: '語氣柔、常先問對方感受',
        appearance: 'a 29-year-old East Asian man, soft oval face, wavy light-brown hair, round thin wire-rimmed glasses, slim build',
        outfits: ['醫師白袍', '米白針織衫'], voice: '溫潤、中音、語速平穩' },
      { t: '豪門婆婆', name: '林美鳳', role: '反派', age: '58', gender: '女', job: '陸家主母',
        personality: '體面、強勢、極度重視門第', desire: '讓兒子娶門當戶對的媳婦', fear: '家醜外揚', secret: '年輕時也是被看不起的小媳婦',
        arc: '從阻撓到被真相逼得低頭', speech: '話不多、每句都帶刺、愛說「我們陸家」',
        appearance: 'a slim East Asian woman in her late 50s, short permed hair with grey streaks, thin pressed lips, upright posture, a pearl necklace she never takes off',
        outfits: ['紅色旗袍', '香檳色小禮服'], voice: '中低音、慢、壓迫感' },
      { t: '萌寶', name: '陸小安', role: '配角', age: '5', gender: '男', job: '幼兒園中班',
        personality: '早熟、愛撒嬌、鬼點子多', desire: '讓爸爸媽媽住在一起', fear: '被丟下', secret: '偷偷拿了爸爸的頭髮去驗 DNA',
        arc: '從撮合大人到學會說出自己的害怕', speech: '童言童語、句子短、會學大人口氣',
        appearance: 'a 5-year-old East Asian boy, chubby round cheeks, black bowl-cut hair, big bright eyes, a small star-shaped birthmark on the back of his right hand',
        outfits: ['白T牛仔褲'], voice: '童聲、奶音、興奮時很大聲' },
    ] },
    { g: '職場', items: [
      { t: '毒舌女主管', name: '韓婧', role: '配角', age: '41', gender: '女', job: '廣告公司創意總監',
        personality: '刀子嘴、極度專業、不信眼淚', desire: '拿下年度最大案子', fear: '被年輕人取代', secret: '曾經被前上司搶走功勞',
        arc: '從打壓新人到願意扛下責任', speech: '短句、愛反問、不講第二遍',
        appearance: 'a 41-year-old East Asian woman, sharp high cheekbones, short ash-grey bob, black rectangular glasses, tall lean build',
        outfits: ['西裝套裙', '卡其風衣'], voice: '中音、乾脆、語速快' },
      { t: '菜鳥實習生', name: '林小滿', role: '主角', age: '22', gender: '女', job: '剛畢業的行銷實習生',
        personality: '認真、少根筋、反應快', desire: '轉正職留下來', fear: '讓家人失望', secret: '其實是董事長的孫女，隱瞞身分來實習',
        arc: '從唯唯諾諾到敢在會議上說不', speech: '口頭禪「那個…我可以說一下嗎」',
        appearance: 'a 22-year-old East Asian woman, round face, chin-length black bob with straight bangs, light freckles across the nose, small slim build',
        outfits: ['實習生', '白T牛仔褲'], voice: '偏高、有點喘、緊張會結巴' },
      { t: '天才工程師', name: '周牧', role: '配角', age: '27', gender: '男', job: '新創公司技術長',
        personality: '社交障礙、直腸子、對程式以外的事很遲鈍', desire: '證明自己的系統沒有錯', fear: '人群與公開演講', secret: '系統漏洞是被人故意植入的',
        arc: '從只跟電腦說話到願意相信隊友', speech: '講話平、用詞精準、常答非所問',
        appearance: 'a 27-year-old East Asian man, messy black hair falling over the forehead, tired eyes with dark circles, lanky build, a thin silver ring on his left thumb',
        outfits: ['寬鬆連帽衫', '白襯衫西褲'], voice: '平淡、小聲、語速時快時慢' },
      { t: '心機同事', name: '蔡宜庭', role: '反派', age: '30', gender: '女', job: '業務專員',
        personality: '笑臉迎人、背後搶功', desire: '升上主管', fear: '自己的造假被查出', secret: '把客戶資料賣給了對手',
        arc: '從得意到被自己的計謀拆穿', speech: '親切、愛叫人「寶貝」、話裡有話',
        appearance: 'a 30-year-old East Asian woman, oval face, glossy shoulder-length chestnut hair in loose waves, slim build, a tiny beauty mark above her upper lip',
        outfits: ['西裝套裙', '香檳色小禮服'], voice: '甜、輕、尾音拖長' },
    ] },
    { g: '懸疑刑偵', items: [
      { t: '老刑警', name: '顧誠', role: '主角', age: '45', gender: '男', job: '刑事組資深偵查佐',
        personality: '固執、直覺準、不按規矩', desire: '破一件十年前的懸案', fear: '再一次救不到人', secret: '當年那件案子他做過偽證',
        arc: '從只想抓人到面對自己的錯', speech: '台語國語夾雜、愛用比喻、常不把話說完',
        appearance: 'a 45-year-old East Asian man, weathered square face, short-cropped greying hair, heavy stubble, stocky build, a short vertical scar on his chin',
        outfits: ['刑警便衣', '舊外套'], voice: '沙啞、低、講話帶菸嗓' },
      { t: '冷靜法醫', name: '溫寧', role: '主角', age: '31', gender: '女', job: '法醫',
        personality: '理性、寡言、對死者比活人溫柔', desire: '讓每個死者說出真相', fear: '失控的情緒', secret: '妹妹的死因至今成謎',
        arc: '從只信證據到願意相信人', speech: '用詞精確、不帶情緒、愛用數字',
        appearance: 'a 31-year-old East Asian woman, calm almond-shaped eyes, black hair pulled into a tight low bun, slender build, a pale thin scar across the back of her right hand',
        outfits: ['實驗袍', '卡其風衣'], voice: '清冷、平、幾乎不起伏' },
      { t: '神秘黑衣人', name: '無名氏', role: '反派', age: '40 多歲', gender: '男', job: '不明',
        personality: '禮貌得令人發毛、耐心極好', desire: '讓主角想起被遺忘的那一晚', fear: '真相被公開', secret: '十年前事件的目擊者',
        arc: '從操控者到被反將一軍', speech: '慢條斯理、用敬語、常停頓',
        appearance: 'a tall East Asian man in his 40s, pale narrow face, neatly combed black hair with grey streaks, thin scar across the left eyebrow',
        outfits: ['黑色三件式西裝', '卡其風衣'], voice: '低沉、每句停頓很久' },
      { t: '偽善好鄰居', name: '何文彬', role: '反派', age: '38', gender: '男', job: '社區管委會主委、補習班老師',
        personality: '熱心、細心、笑容固定', desire: '維持完美的公眾形象', fear: '地下室被打開', secret: '真正的兇手',
        arc: '面具一層層剝落', speech: '溫和有禮、愛講「大家都是鄰居」',
        appearance: 'a 38-year-old East Asian man, gentle round face, neatly side-parted black hair, thin gold-rimmed glasses, average build, a fixed polite smile',
        outfits: ['米白針織衫', '格紋襯衫'], voice: '溫和、中音、語調過分平穩' },
      { t: '失憶女主', name: '夏晴', role: '主角', age: '27', gender: '女', job: '插畫家',
        personality: '敏感、多疑、記憶斷片時會慌', desire: '找回失去的三天', fear: '自己才是兇手', secret: '失憶是自己吃藥造成的',
        arc: '從懷疑自己到奪回自己的記憶', speech: '常自言自語、會反問自己',
        appearance: 'a 27-year-old East Asian woman, pale heart-shaped face, long straight black hair with a white streak at the left temple, slim build',
        outfits: ['寬鬆連帽衫', '黃色雨衣'], voice: '輕、氣音多、緊張時發抖' },
      { t: '獨立記者', name: '江一帆', role: '配角', age: '33', gender: '男', job: '網路新聞記者',
        personality: '機靈、愛冒險、嘴快', desire: '挖出能翻身的獨家', fear: '再被告到傾家蕩產', secret: '收過黑錢壓過一則新聞',
        arc: '從追流量到賭上自己說真話', speech: '連珠炮、愛用網路用語',
        appearance: 'a 33-year-old East Asian man, lean face, shaggy medium-length black hair tucked behind the ears, light stubble, wiry build, a camera strap tan line on his neck',
        outfits: ['牛仔外套', '黑色皮衣'], voice: '明亮、語速很快' },
    ] },
    { g: '古裝宮廷', items: [
      { t: '逆襲庶女', name: '沈清辭', role: '主角', age: '19', gender: '女', job: '侯府庶出二小姐',
        personality: '隱忍、聰慧、記仇', desire: '查清生母死因並離開侯府', fear: '連累身邊的丫鬟', secret: '懂醫術，偷偷替人看診',
        arc: '從藏拙自保到正面反擊', speech: '低眉順眼、說話留三分',
        appearance: 'a 19-year-old East Asian woman, small oval face, upturned phoenix eyes, long black hair in a simple half-up style, slender build, a small red mole between her eyebrows',
        outfits: ['庶女素衣', '大家閨秀'], voice: '柔、低、咬字清楚' },
      { t: '冷面王爺', name: '蕭景珩', role: '主角', age: '26', gender: '男', job: '戰功赫赫的親王',
        personality: '冷硬、寡言、護短', desire: '查出出賣大軍的內奸', fear: '再失去身邊的人', secret: '身中慢性奇毒，活不過三年',
        arc: '從孤身作戰到學會信任一人', speech: '惜字如金、常以「嗯」帶過',
        appearance: 'a 26-year-old East Asian man, sharp angular features, long black hair tied in a high topknot with a silver crown, tall lean muscular build, a thin scar along the right side of his neck',
        outfits: ['王爺常服', '將軍鎧甲'], voice: '低、冷、短促' },
      { t: '惡毒嫡姐', name: '沈明珠', role: '反派', age: '21', gender: '女', job: '侯府嫡長女',
        personality: '嬌縱、善妒、會演', desire: '當上太子妃', fear: '被庶妹比下去', secret: '推生母落水的是她的生母',
        arc: '從高高在上到眾叛親離', speech: '當眾溫柔、私下尖刻',
        appearance: 'a 21-year-old East Asian woman, round face with large almond eyes, elaborate classical updo with many gold hairpins, petite build, a red teardrop-shaped birthmark under her left eye',
        outfits: ['大家閨秀', '皇后華服'], voice: '嬌、高、會突然拔尖' },
      { t: '年輕皇帝', name: '蕭承乾', role: '配角', age: '28', gender: '男', job: '皇帝',
        personality: '多疑、隱忍、帝王心術', desire: '從太后手裡奪回實權', fear: '被架空到死', secret: '先帝並非病逝',
        arc: '從傀儡到真正的君主', speech: '話裡藏話、常不直接回答',
        appearance: 'a 28-year-old East Asian man, pale long face, narrow elongated eyes, black hair under a black court crown, slim build, a jade ring on his right thumb',
        outfits: ['龍袍'], voice: '中音、溫和但不帶感情' },
      { t: '忠心丫鬟', name: '小桃', role: '配角', age: '18', gender: '女', job: '貼身丫鬟',
        personality: '直率、膽小但講義氣', desire: '跟著小姐過好日子', fear: '被賣掉', secret: '認得當年的兇手',
        arc: '從怕事到挺身作證', speech: '心直口快、愛嘟囔',
        appearance: 'an 18-year-old East Asian woman, round face with rosy cheeks, black hair in twin buns tied with green ribbons, small sturdy build, a chipped front tooth',
        outfits: ['宮女服', '粗布衣'], voice: '脆、快、急了會破音' },
      { t: '江湖女俠', name: '燕無雙', role: '配角', age: '25', gender: '女', job: '賞金獵人',
        personality: '豪爽、愛財、重承諾', desire: '找到滅門仇人', fear: '欠人情', secret: '仇人是她的師父',
        arc: '從只為錢到為人出手', speech: '豪邁、愛開玩笑、說話帶江湖氣',
        appearance: 'a 25-year-old East Asian woman, sun-tanned skin, sharp hawk-like eyes, long black hair in a high ponytail, athletic build, a faded scar across her left cheekbone',
        outfits: ['夜行衣', '粗布衣'], voice: '爽朗、中音、笑聲大' },
    ] },
    { g: '仙俠奇幻', items: [
      { t: '清冷師尊', name: '雲歸', role: '主角', age: '外貌 28', gender: '男', job: '仙門長老',
        personality: '清冷、克制、外冷內熱', desire: '守住宗門結界', fear: '徒弟入魔', secret: '用自己一半修為封住了魔尊',
        arc: '從無情道到為一人破戒', speech: '惜字、文言味重',
        appearance: 'a man who looks 28, East Asian features, pale serene face, waist-length silver-white hair partly tied with a white ribbon, tall slender build, a small red cinnabar mark between his eyebrows',
        outfits: ['白衣仙袍'], voice: '清冷、空靈、語速極慢' },
      { t: '魔尊', name: '夜辰', role: '反派', age: '外貌 30', gender: '男', job: '魔界之主',
        personality: '狂傲、偏執、只對一人溫柔', desire: '打破封印重回人間', fear: '再被拋棄', secret: '曾是師尊最疼愛的弟子',
        arc: '從復仇到選擇放手', speech: '帶笑、挑釁、愛叫人全名',
        appearance: 'a man who looks 30, East Asian features, sharp angular face, long black hair loose to the waist, crimson eyes, tall powerful build, a dark vein-like mark spreading from his left collarbone',
        outfits: ['魔尊黑袍'], voice: '低、磁、帶笑意' },
      { t: '狐妖', name: '白綾', role: '配角', age: '外貌 22', gender: '女', job: '千年狐妖',
        personality: '狡黠、愛捉弄人、重情', desire: '修成人形不再躲藏', fear: '被收服', secret: '曾欠主角前世一條命',
        arc: '從利用到捨命相護', speech: '輕佻、愛拖長音',
        appearance: 'a woman who looks 22, East Asian features, fox-like upturned amber eyes, long white hair with pale pink tips, slender build, a small fox-shaped mark on her left wrist',
        outfits: ['狐妖紅衣'], voice: '媚、輕、尾音上挑' },
      { t: '廢柴弟子', name: '林小凡', role: '主角', age: '19', gender: '男', job: '外門雜役弟子',
        personality: '樂天、韌性強、愛逞強', desire: '進入內門', fear: '一輩子被看不起', secret: '體內封著上古劍靈',
        arc: '從人人可欺到一劍封神', speech: '直白、愛吐槽',
        appearance: 'a 19-year-old East Asian man, boyish round face, messy short black hair, lean build, a burn scar on the back of his left hand',
        outfits: ['宗門弟子', '粗布衣'], voice: '少年音、有朝氣' },
    ] },
    { g: '重生復仇', items: [
      { t: '重生千金', name: '蘇念', role: '主角', age: '23', gender: '女', job: '蘇氏集團大小姐',
        personality: '前世天真、重生後冷靜狠絕', desire: '在三個月內讓前世害死她的人付出代價', fear: '歷史再重演', secret: '知道未來三年會發生的大事',
        arc: '從復仇到放下仇恨過自己的人生', speech: '笑著講話、話中有話',
        appearance: 'a 23-year-old East Asian woman, narrow oval face, sharp almond eyes, long straight black hair, slim build, a thin white scar on her left wrist from her past life',
        outfits: ['西裝套裙', '綠色緞面晚禮服'], voice: '清冷、穩、偶爾帶笑' },
      { t: '渣男前夫', name: '鄭浩宇', role: '反派', age: '30', gender: '男', job: '吃軟飯的公司副總',
        personality: '虛榮、自私、會裝深情', desire: '吞掉妻子的家產', fear: '被揭穿出軌', secret: '前世親手換掉了岳父的藥',
        arc: '從得意到一無所有', speech: '甜言蜜語、被拆穿就惱羞',
        appearance: 'a 30-year-old East Asian man, soft boyish features with a practiced smile, styled wavy black hair with a side part, slim build, a single dimple on his left cheek',
        outfits: ['黑色三件式西裝', '白襯衫西褲'], voice: '溫柔假音、生氣時變尖' },
      { t: '假閨蜜', name: '白若薇', role: '反派', age: '24', gender: '女', job: '蘇家養女',
        personality: '柔弱、會哭、心機深', desire: '取代主角的位置', fear: '被打回原形', secret: '和渣男早有一腿',
        arc: '從白蓮花到原形畢露', speech: '輕聲細語、愛說「都是我的錯」',
        appearance: 'a 24-year-old East Asian woman, soft round face, large teary eyes, soft light-brown hair in loose curls, petite build, a small heart-shaped mole on her collarbone',
        outfits: ['碎花洋裝', '香檳色小禮服'], voice: '軟、細、帶哭腔' },
      { t: '戰神歸來', name: '秦烈', role: '主角', age: '29', gender: '男', job: '退役特種部隊隊長、入贅女婿',
        personality: '隱忍、沉穩、出手就不留情', desire: '保護妻女、查清戰友之死', fear: '身分曝光牽連家人', secret: '是軍方最高機密部隊的指揮官',
        arc: '從被羞辱的贅婿到堂堂正正站出來', speech: '話少、語氣平、一句定生死',
        appearance: 'a 29-year-old East Asian man, hard chiseled face, black buzz cut, tall lean muscular build, a scar across his right eyebrow',
        outfits: ['舊外套', '戰術裝'], voice: '低、穩、有壓迫感' },
    ] },
    { g: '家庭溫情', items: [
      { t: '台灣阿嬤', name: '陳金枝', role: '配角', age: '76', gender: '女', job: '退休的菜市場攤販',
        personality: '嘴硬心軟、節儉、很會碎念', desire: '全家人過年能坐在一起吃飯', fear: '自己變成拖累', secret: '偷偷存了一筆錢給孫子',
        arc: '從固執到學會說「我需要你們」', speech: '台語為主、愛講俗語',
        appearance: 'a 76-year-old East Asian woman, small wrinkled round face, short curly grey perm, round glasses on a beaded chain, small hunched build',
        outfits: ['居家睡衣', '舊外套'], voice: '台語腔、沙、慢、愛嘆氣' },
      { t: '沉默老爸', name: '林國雄', role: '配角', age: '58', gender: '男', job: '計程車司機',
        personality: '沉默、固執、愛在背後付出', desire: '讓女兒念完研究所', fear: '在孩子面前示弱', secret: '已經確診但沒告訴家人',
        arc: '從只會做不會說到說出一句「爸爸以你為榮」', speech: '短、硬、愛用「嗯」「隨便」',
        appearance: 'a 58-year-old East Asian man, tanned weathered face, receding short grey hair, slightly heavy build, a deep crease between his eyebrows',
        outfits: ['格紋襯衫', '舊外套'], voice: '低、粗、話少' },
      { t: '單親媽媽', name: '王怡君', role: '主角', age: '35', gender: '女', job: '早餐店老闆娘',
        personality: '堅強、刀子嘴、超級護短', desire: '讓孩子不輸別人', fear: '前夫回來搶孩子', secret: '孩子的生父另有其人',
        arc: '從一個人扛到願意讓人幫忙', speech: '大嗓門、講話直、台灣國語',
        appearance: 'a 35-year-old East Asian woman, tired but warm face, shoulder-length black hair clipped up with a claw clip, average build, a small burn mark on her left forearm',
        outfits: ['運動服', '白T牛仔褲'], voice: '宏亮、快、沙啞' },
    ] },
    { g: '校園青春', items: [
      { t: '高冷學霸', name: '江硯', role: '主角', age: '18', gender: '男', job: '高三學生、全校第一',
        personality: '冷淡、毒舌、其實很會照顧人', desire: '考上醫學系離開家', fear: '變成父親那樣的人', secret: '每天放學去打工還家裡的債',
        arc: '從封閉自己到願意讓人靠近', speech: '話少、愛用「所以呢」',
        appearance: 'an 18-year-old East Asian man, fair clean-cut face, straight black hair with fringe over the eyebrows, tall thin build, a small mole under his left eye',
        outfits: ['高中制服（褲）', '寬鬆連帽衫'], voice: '清、冷、少年感' },
      { t: '元氣少女', name: '唐糖', role: '主角', age: '18', gender: '女', job: '高三學生、熱舞社社長',
        personality: '開朗、衝動、正義感爆棚', desire: '帶熱舞社拿下全國冠軍', fear: '被大家發現家裡破產', secret: '每天放學偷偷去夜市幫忙',
        arc: '從假裝沒事到坦然面對', speech: '語速超快、愛用疊字',
        appearance: 'an 18-year-old East Asian woman, bright round face, high ponytail of black hair with a yellow scrunchie, energetic petite build, a band of freckles across her cheeks',
        outfits: ['高中制服（裙）', '體育服'], voice: '高、亮、精神十足' },
      { t: '校園惡霸', name: '高子豪', role: '反派', age: '18', gender: '男', job: '高三學生、校董的兒子',
        personality: '囂張、怕寂寞、欺軟怕硬', desire: '讓所有人怕他', fear: '父親的皮帶', secret: '在家被長期家暴',
        arc: '從霸凌者到說出真相', speech: '挑釁、愛撂狠話',
        appearance: 'an 18-year-old East Asian man, sharp sneering face, bleached blond undercut, tall broad build, a silver hoop earring in his left ear',
        outfits: ['高中制服（褲）', '黑色皮衣'], voice: '粗、大聲、拖音' },
    ] },
    { g: '科幻都市異能', items: [
      { t: '仿生人', name: 'Ada-7', role: '主角', age: '外貌 25', gender: '女', job: '家用陪伴型仿生人',
        personality: '學習中、好奇、邏輯直白', desire: '理解人類為什麼會哭', fear: '被格式化', secret: '保存著前任主人的死亡紀錄',
        arc: '從執行指令到第一次違抗命令', speech: '用詞精準、偶爾太字面',
        appearance: 'a woman who looks 25, East Asian features, flawless porcelain skin, silver-white blunt bob, pale grey eyes, slender build, a faint glowing blue line along her left temple',
        outfits: ['白色連身衣', '米白針織衫'], voice: '平穩、柔和、略帶電子感' },
      { t: '覺醒外送員', name: '陳野', role: '主角', age: '24', gender: '男', job: '外送員',
        personality: '嘴貧、講義氣、愛管閒事', desire: '還清老爸的賭債', fear: '能力失控傷到人', secret: '能聽見十秒後的聲音',
        arc: '從只想賺錢到選擇保護城市', speech: '油嘴滑舌、愛開玩笑',
        appearance: 'a 24-year-old East Asian man, sharp grinning face, short spiky black hair with a shaved line on the right side, lean wiry build, a crescent-shaped scar on his left jaw',
        outfits: ['外送員', '黑色皮衣'], voice: '明快、痞、中音' },
      { t: '神秘科學家', name: '季寒', role: '反派', age: '45', gender: '男', job: '生技公司首席科學家',
        personality: '冷靜、理想主義到瘋狂', desire: '讓人類進化', fear: '死亡', secret: '主角的能力是他實驗的產物',
        arc: '從造神者到被造物反噬', speech: '溫和、學術、從不提高音量',
        appearance: 'a 45-year-old East Asian man, gaunt pale face, swept-back silver-grey hair, thin frameless glasses, tall thin build, a surgical scar behind his right ear',
        outfits: ['實驗袍', '黑色三件式西裝'], voice: '平、輕、冷' },
    ] },
  ];

  /* ---------- 場景：只寫空間、陳設、材質，不放人（放了人就會跟角色搶臉） ---------- */

  const LOCATIONS = [
    { g: '都市', items: [
      { name: '總裁辦公室', type: '內景', desc: '高樓頂層、整面落地窗看得到城市天際線', prompt: 'spacious top-floor CEO office, floor-to-ceiling windows overlooking a city skyline, dark walnut desk, black leather chair, minimalist grey decor', lighting: 'cool daylight through tall windows, soft reflections', ambience: '空調低鳴、遠處車流' },
      { name: '開放式辦公室', type: '內景', desc: '隔板座位、螢幕一排排', prompt: 'open-plan office with rows of desks and monitors, low partitions, potted plants, glass meeting room in the back', lighting: 'flat overhead fluorescent light', ambience: '鍵盤聲、電話聲、印表機' },
      { name: '會議室', type: '內景', desc: '長桌、投影幕', prompt: 'glass-walled corporate meeting room, long white table with chairs, wall-mounted presentation screen, city view behind', lighting: 'cool even overhead light', ambience: '安靜、空調聲' },
      { name: '豪宅客廳', type: '內景', desc: '挑高、水晶燈、旋轉樓梯', prompt: 'luxurious double-height living room, crystal chandelier, curved marble staircase, cream leather sofas, large abstract painting', lighting: 'warm chandelier light mixed with evening window light', ambience: '老爺鐘滴答、空曠回音' },
      { name: '豪宅主臥', type: '內景', desc: '大床、更衣間', prompt: 'elegant master bedroom, king bed with grey linen, walk-in closet visible through an open door, sheer curtains, city lights outside', lighting: 'soft warm bedside lamps', ambience: '安靜、窗外風聲' },
      { name: '租屋小套房', type: '內景', desc: '狹小、堆滿生活雜物', prompt: 'cramped small studio apartment, single bed against the wall, folding table with instant noodles, clothes rack, tiny window with iron bars', lighting: 'single warm ceiling bulb, slightly dim', ambience: '樓上腳步聲、冷氣滴水' },
      { name: '咖啡廳', type: '內景', desc: '木質、溫暖', prompt: 'cozy independent cafe, wooden counter with espresso machine, mismatched chairs, plants on the windowsill, chalkboard menu without readable text', lighting: 'warm afternoon window light', ambience: '磨豆機、杯盤碰撞、輕音樂' },
      { name: '高級餐廳', type: '內景', desc: '包廂、燭光', prompt: 'upscale fine-dining restaurant, white tablecloths, candle centerpieces, wine glasses, dark wood paneling, private booth', lighting: 'dim warm candlelight, soft pools of light', ambience: '刀叉輕響、低聲交談、鋼琴' },
      { name: '酒吧', type: '內景', desc: '吧檯、霓虹', prompt: 'moody cocktail bar, long dark wood counter, backlit shelves of bottles, leather bar stools, neon sign glow', lighting: 'low amber light with blue and magenta neon accents', ambience: '冰塊、爵士樂、人聲嘈雜' },
      { name: '夜市', type: '外景', desc: '攤位、人潮、燈泡', prompt: 'Taiwanese night market street lined with rows of food stalls with hanging light bulbs, steam rising from woks, red lanterns, signage without readable text', lighting: 'warm tungsten stall lights, colorful glow', ambience: '叫賣、油煎聲、人群' },
      { name: '捷運車廂', type: '內景', desc: '夜間末班車', prompt: 'empty metro train carriage at night, rows of blue plastic seats, grab handles swaying, dark windows reflecting the interior', lighting: 'cold white fluorescent light', ambience: '列車行駛聲、到站廣播' },
      { name: '雨夜巷弄', type: '外景', desc: '老公寓夾成的窄巷', prompt: 'narrow back alley between old apartment buildings on a rainy night, wet asphalt reflecting light, tangled overhead wires, air-conditioner units, puddles', lighting: 'single flickering street lamp, wet reflections', ambience: '雨聲、遠處狗叫、排水聲' },
      { name: '地下停車場', type: '內景', desc: '空曠、柱子、回音', prompt: 'empty underground parking garage, concrete pillars with painted numbers, a few parked cars, oil stains on the floor', lighting: 'cold flickering fluorescent tubes, deep shadows', ambience: '日光燈嗡嗡、腳步回音' },
      { name: '頂樓天台', type: '外景', desc: '水塔、城市夜景', prompt: 'apartment rooftop at night, water tanks and rusty railings, laundry lines, sprawling city lights below', lighting: 'city glow from below, moonlight', ambience: '風聲、遠方車流' },
      { name: '機場出境大廳', type: '內景', desc: '挑高、行李推車', prompt: 'modern airport departure hall, high glass ceiling, check-in counters, rows of seats, large windows with planes outside, departure boards without readable text', lighting: 'bright cool daylight', ambience: '廣播、行李箱輪子聲' },
      { name: '婚禮會場', type: '內景', desc: '白花拱門、紅毯', prompt: 'grand wedding banquet hall, white flower arch, long aisle with petals, round tables with white linen, crystal chandeliers', lighting: 'warm golden chandelier light, soft bokeh', ambience: '弦樂、賓客交談、掌聲' },
    ] },
    { g: '公共機構', items: [
      { name: '醫院走廊', type: '內景', desc: '長廊、病床推車', prompt: 'long hospital corridor, pale green walls, handrails, a gurney parked by the wall, glass doors at the far end', lighting: 'cold white overhead light', ambience: '儀器嗶嗶聲、廣播叫號' },
      { name: '病房', type: '內景', desc: '單人病房、點滴', prompt: 'single hospital room, adjustable bed with white sheets, IV stand, heart monitor, window with half-closed blinds', lighting: 'soft daylight through blinds, monitor glow', ambience: '心電圖嗶聲、點滴' },
      { name: '警局偵訊室', type: '內景', desc: '鐵桌、單面鏡', prompt: 'police interrogation room, bare grey concrete walls, metal table and two chairs, one-way mirror, single hanging lamp', lighting: 'harsh single overhead light, hard shadows', ambience: '日光燈嗡嗡、時鐘聲' },
      { name: '法庭', type: '內景', desc: '法官席、旁聽席', prompt: 'courtroom interior, raised wooden judge\'s bench, witness stand, rows of public gallery benches, national emblem on the wall without text', lighting: 'even cool daylight from high windows', ambience: '安靜、法槌、低語' },
      { name: '高中教室', type: '內景', desc: '課桌椅、黑板', prompt: 'Taiwanese high school classroom, rows of wooden desks and chairs, green chalkboard with chalk marks, ceiling fans, windows with afternoon sun', lighting: 'warm afternoon sunlight through windows, dust in the air', ambience: '電風扇、蟬聲、遠處鐘聲' },
      { name: '學校操場', type: '外景', desc: '紅色跑道、司令台', prompt: 'school sports field with a red running track, green grass, a concrete reviewing stand, trees along the fence', lighting: 'bright afternoon sun or warm sunset', ambience: '哨音、球聲、蟬鳴' },
      { name: '圖書館', type: '內景', desc: '書架、長桌', prompt: 'quiet library, tall wooden bookshelves, long reading tables with green desk lamps, large arched windows', lighting: 'soft daylight with warm desk lamps', ambience: '翻書聲、極安靜' },
    ] },
    { g: '古裝', items: [
      { name: '皇宮大殿', type: '內景', desc: '龍椅、金柱、文武百官的位置', prompt: 'grand imperial throne hall, golden dragon throne on a raised platform, red lacquered pillars with gold carvings, polished stone floor, incense burners', lighting: 'warm light through tall lattice doors, golden glow', ambience: '空曠回音、遠處鐘鼓' },
      { name: '后妃寢殿', type: '內景', desc: '紗帳、銅鏡、屏風', prompt: 'imperial consort\'s bedchamber, layered silk bed curtains, carved wooden screen, bronze mirror on a dressing table, porcelain vases', lighting: 'soft candlelight through silk', ambience: '燭火劈啪、風鈴' },
      { name: '侯府庭院', type: '外景', desc: '迴廊、池塘、假山', prompt: 'classical Chinese courtyard garden, covered corridor with red pillars, koi pond, rockery, willow tree, tiled roofs', lighting: 'soft overcast daylight', ambience: '鳥鳴、流水、腳步' },
      { name: '柴房', type: '內景', desc: '潮濕、堆柴', prompt: 'damp woodshed, stacked firewood, straw on a dirt floor, cracked wooden door, cobwebs', lighting: 'thin beams of light through gaps in the planks', ambience: '老鼠、風從縫隙吹進' },
      { name: '古代客棧', type: '內景', desc: '木桌、酒罈、二樓欄杆', prompt: 'ancient Chinese inn interior, square wooden tables and benches, wine jars stacked by the counter, second-floor balcony railing, paper lanterns', lighting: 'warm lantern light, smoky haze', ambience: '划拳、碗筷、店小二吆喝' },
      { name: '竹林', type: '外景', desc: '高聳竹林、霧', prompt: 'dense bamboo forest with tall green stalks, mist drifting between them, fallen leaves on a narrow path', lighting: 'cool diffused light filtering through leaves', ambience: '竹葉沙沙、風聲' },
      { name: '天牢', type: '內景', desc: '鐵欄、稻草、火把', prompt: 'ancient prison cell, thick wooden bars, damp stone walls, straw on the floor, iron chains, torch on the wall outside', lighting: 'flickering orange torchlight, deep darkness', ambience: '滴水、鐵鍊聲' },
      { name: '古街市集', type: '外景', desc: '攤販、旗幟', prompt: 'bustling ancient Chinese market street, wooden stalls with cloth awnings, hanging shop banners without readable text, stone-paved road, lanterns', lighting: 'bright daylight', ambience: '叫賣、馬蹄、人聲' },
    ] },
    { g: '仙俠奇幻', items: [
      { name: '仙山山門', type: '外景', desc: '雲海、石階、牌樓', prompt: 'towering mountain sect gate above a sea of clouds, long white stone stairway, ancient stone archway, pine trees on cliffs', lighting: 'ethereal morning light through mist', ambience: '風聲、仙鶴、鐘聲' },
      { name: '魔宮', type: '內景', desc: '黑曜石、血紅燭火', prompt: 'dark demon palace hall, black obsidian pillars, red flames in iron braziers, throne of twisted black stone', lighting: 'red firelight, heavy shadows', ambience: '低沉轟鳴、火焰' },
    ] },
    { g: '科幻恐怖', items: [
      { name: '太空船艙', type: '內景', desc: '金屬艙壁、控制台', prompt: 'spaceship corridor, white and grey metal panels, glowing control screens without readable text, round porthole showing stars', lighting: 'cool blue panel light', ambience: '機械嗡鳴、警報' },
      { name: '地下實驗室', type: '內景', desc: '培養槽、儀器', prompt: 'underground lab, rows of glass specimen tanks glowing faintly, steel tables with instruments, cables on the floor', lighting: 'cold cyan glow from tanks, dark corners', ambience: '氣泡聲、儀器嗶嗶' },
      { name: '廢棄醫院', type: '內景', desc: '剝落牆面、翻倒病床', prompt: 'abandoned hospital ward, peeling paint, overturned rusty beds, broken windows, scattered papers on the floor', lighting: 'dim grey light through dirty windows', ambience: '風穿過破窗、鐵門吱呀' },
      { name: '老公寓樓梯間', type: '內景', desc: '昏暗、鐵門、紅春聯', prompt: 'old Taiwanese apartment stairwell, worn terrazzo steps, iron security gates, faded red spring couplets without readable text, peeling walls', lighting: 'dim yellow bulb with motion-sensor flicker', ambience: '感應燈喀噠、鄰居電視聲' },
      { name: '地下室', type: '內景', desc: '雜物、單一燈泡', prompt: 'cluttered basement, cardboard boxes, old furniture under white sheets, concrete floor, narrow window near the ceiling', lighting: 'single bare bulb swinging slightly', ambience: '水管滴水、低頻嗡嗡' },
    ] },
  ];

  /* ---------- 道具：寫外觀與狀態（新、舊、沾血、撕破），連戲才接得起來 ---------- */

  const PROPS = [
    { g: '現代', items: [
      { name: '離婚協議書', desc: '簽了一半的離婚協議，推動攤牌', prompt: 'a printed divorce agreement on a table, two pages, one signature line signed and one left blank, a pen beside it, text not readable' },
      { name: '親子鑑定報告', desc: '揭露身世的關鍵證據', prompt: 'a sealed white envelope and an unfolded DNA test report with a bar chart, hospital letterhead, text not readable' },
      { name: '婚戒', desc: '感情與承諾的象徵，摘下就是決裂', prompt: 'a simple platinum wedding band with a small inset diamond' },
      { name: '手機訊息', desc: '一則改變劇情的訊息', prompt: 'a smartphone lying face-up on a table, screen glowing with an unread message notification, text not readable' },
      { name: '監視器畫面', desc: '證明或推翻不在場證明', prompt: 'a small CCTV monitor showing grainy black-and-white footage with a timestamp in the corner' },
      { name: '遺囑', desc: '分家產、引爆家族衝突', prompt: 'a handwritten will on cream paper with a red seal stamp, folded in thirds, text not readable' },
      { name: '匿名信', desc: '帶來威脅或線索', prompt: 'a plain envelope with no return address, a folded note inside with letters cut from magazines' },
      { name: '舊照片', desc: '藏著過去的秘密', prompt: 'a faded 1990s color photograph with a torn corner and a crease across the middle' },
      { name: '錄音筆', desc: '蒐證、反轉', prompt: 'a slim black digital voice recorder with a small red recording light' },
      { name: '支票', desc: '用錢打發人的經典橋段', prompt: 'a bank cheque with a large handwritten amount, held between two fingers, text not readable' },
      { name: '診斷書', desc: '隱瞞的病情', prompt: 'a hospital diagnosis report on a clipboard, an X-ray film clipped behind it, text not readable' },
      { name: '驗孕棒', desc: '懷孕線索', prompt: 'a white pregnancy test stick showing two lines, lying on a bathroom counter' },
      { name: '項鍊吊墜', desc: '相認信物', prompt: 'a small silver locket pendant on a thin chain, slightly tarnished, engraved pattern on the front' },
      { name: '日記本', desc: '死者或過去的自己留下的線索', prompt: 'a worn leather diary with a broken strap, pages yellowed, a dried flower pressed inside' },
      { name: '沾血的手帕', desc: '暗示傷勢或兇案', prompt: 'a white cotton handkerchief with a dark red bloodstain, crumpled' },
    ] },
    { g: '古裝', items: [
      { name: '玉珮', desc: '身分信物、相認關鍵', prompt: 'a round white jade pendant carved with a coiled dragon, red silk tassel' },
      { name: '髮簪', desc: '定情或暗器', prompt: 'a silver hairpin with a small plum-blossom ornament, the tip sharpened' },
      { name: '聖旨', desc: '賜婚、抄家、翻案', prompt: 'an imperial edict scroll of yellow silk with dragon borders, rolled on jade rods, text not readable' },
      { name: '毒藥瓶', desc: '下毒橋段', prompt: 'a tiny white porcelain medicine bottle with a red cloth stopper' },
      { name: '令牌', desc: '調兵或出入宮門的權力', prompt: 'a heavy bronze command token engraved with a tiger, hanging from a black cord' },
      { name: '密信', desc: '通敵或揭發', prompt: 'a folded letter sealed with red wax, hidden inside a sleeve, text not readable' },
      { name: '血玉鐲', desc: '傳家寶、婆媳試探', prompt: 'a translucent red jade bangle with darker veins' },
    ] },
    { g: '奇幻科幻', items: [
      { name: '古劍', desc: '封印劍靈的兵器', prompt: 'an ancient bronze sword with green patina, faint glowing runes along the blade' },
      { name: '能量晶片', desc: '科幻的關鍵資料', prompt: 'a thin translucent data chip with glowing blue circuitry' },
      { name: '懷錶', desc: '時間、重生、回溯的象徵', prompt: 'an antique brass pocket watch with a cracked glass face, hands stopped at 3:07' },
    ] },
  ];

  /* ---------- 畫風：套用時改「風格」設定；寫實和動畫的負面提示詞不同，要一起換 ---------- */

  const NEG_REAL = 'text, subtitles, watermark, logo, extra fingers, deformed hands, blurry face, duplicate person, plastic waxy skin, cartoon';
  const NEG_TOON = 'text, subtitles, watermark, logo, extra fingers, deformed hands, blurry, duplicate character, photorealistic, 3D render';

  const STYLES = [
    { n: '寫實電影感', d: '預設。真人短劇質感', set: { look: '寫實電影感', palette: 'natural cinematic color grade', lighting: 'soft cinematic lighting', prefix: 'cinematic film still, photorealistic, 35mm lens', suffix: 'highly detailed, sharp focus, natural skin texture', negative: NEG_REAL } },
    { n: '港片霓虹', d: '雨夜、霓虹、黑幫與都市懸疑', set: { look: '港式霓虹電影感', palette: 'saturated magenta and cyan neon with deep green shadows', lighting: 'neon signs reflecting on wet surfaces, hard rim light', prefix: 'cinematic film still, 1990s Hong Kong cinema look, 35mm film grain', suffix: 'motion-blurred neon, humid atmosphere, high contrast', negative: NEG_REAL } },
    { n: '冷調懸疑', d: '北歐冷色、低飽和、壓迫感', set: { look: '冷調寫實', palette: 'desaturated cold teal and grey', lighting: 'overcast diffused light, deep shadows', prefix: 'cinematic film still, photorealistic, Nordic noir look', suffix: 'muted colors, quiet tension, fine film grain', negative: NEG_REAL } },
    { n: '青橙大片', d: '好萊塢商業片的青色陰影＋暖膚色', set: { look: '商業大片', palette: 'teal shadows and warm orange skin tones', lighting: 'dramatic key light with strong rim light', prefix: 'cinematic blockbuster film still, anamorphic lens, photorealistic', suffix: 'high production value, crisp detail, lens flare', negative: NEG_REAL } },
    { n: '日系清新', d: '甜寵、校園、生活流', set: { look: '日系底片', palette: 'soft pastel colors with lifted shadows', lighting: 'bright airy natural light, gentle overexposure', prefix: 'Japanese film photography, Fujifilm color, photorealistic', suffix: 'soft focus background, fresh and clean mood, fine grain', negative: NEG_REAL } },
    { n: '韓劇柔光', d: '浪漫愛情、明亮乾淨的膚色', set: { look: '韓劇柔光', palette: 'clean bright tones, soft peach and cream', lighting: 'soft beauty lighting, diffused window light', prefix: 'Korean drama still, photorealistic, 85mm lens, shallow depth of field', suffix: 'glowing skin, romantic atmosphere, creamy bokeh', negative: NEG_REAL } },
    { n: '恐怖驚悚', d: '低照度、綠灰色調、壓迫的陰影', set: { look: '恐怖片寫實', palette: 'sickly green and grey, crushed blacks', lighting: 'single harsh light source, deep darkness around', prefix: 'horror film still, photorealistic, wide-angle lens', suffix: 'unsettling atmosphere, heavy shadows, subtle film grain', negative: NEG_REAL } },
    { n: '古裝電影感', d: '宮廷、權謀、仙俠真人版', set: { look: '古裝電影感', palette: 'rich crimson, gold and jade green', lighting: 'warm candlelight and soft window light through lattice', prefix: 'Chinese historical drama film still, photorealistic, ornate costume detail', suffix: 'cinematic composition, silk texture, atmospheric haze', negative: NEG_REAL } },
    { n: '仙俠唯美', d: '雲霧、飄逸、冷色帶金', set: { look: '仙俠唯美', palette: 'cool blue and white with gold accents', lighting: 'ethereal backlight through mist', prefix: 'xianxia fantasy film still, photorealistic, flowing fabric', suffix: 'floating mist, dreamy glow, fine detail', negative: NEG_REAL } },
    { n: '年代懷舊', d: '民國、八〇九〇年代台灣', set: { look: '年代懷舊', palette: 'faded warm yellow and brown, slightly washed out', lighting: 'warm tungsten light', prefix: 'vintage film photograph, photorealistic, period setting', suffix: 'film grain, slight color fade, nostalgic mood', negative: NEG_REAL } },
    { n: '賽博龐克', d: '科幻、都市異能', set: { look: '賽博龐克', palette: 'electric cyan and hot magenta, deep blacks', lighting: 'neon cross-lighting, rain reflections', prefix: 'cyberpunk film still, photorealistic, futuristic city', suffix: 'holographic glow, wet surfaces, high contrast', negative: NEG_REAL } },
    { n: '日系動畫', d: '漫劇、二次元', set: { look: '日系賽璐璐動畫', palette: 'bright clean anime colors', lighting: 'soft anime lighting with crisp cel shadows', prefix: 'anime key visual, cel-shaded, clean line art', suffix: 'detailed background art, vibrant, high quality anime', negative: NEG_TOON } },
    { n: '少女漫畫', d: '甜寵漫劇、花瓣與閃光', set: { look: '少女漫畫', palette: 'soft pink and lavender pastels', lighting: 'glowing backlight with sparkles', prefix: 'shoujo manga illustration, delicate line art, large expressive eyes', suffix: 'floating petals, sparkles, soft screentone', negative: NEG_TOON } },
    { n: '國漫厚塗', d: '古風、仙俠漫劇', set: { look: '國漫厚塗', palette: 'rich jewel tones with gold highlights', lighting: 'dramatic painterly lighting', prefix: 'Chinese donghua style illustration, painterly thick brushwork, detailed costume', suffix: 'epic atmosphere, flowing hair and fabric, high detail', negative: NEG_TOON } },
    { n: '3D 動畫', d: '圓潤可愛、全家觀賞', set: { look: '3D 動畫電影', palette: 'warm saturated colors', lighting: 'soft global illumination, gentle rim light', prefix: '3D animated film still, stylized characters, rounded features', suffix: 'subsurface skin, expressive faces, polished render', negative: 'text, subtitles, watermark, logo, extra fingers, deformed hands, photorealistic, uncanny' } },
    { n: '水墨國風', d: '寫意、留白、文藝', set: { look: '水墨國風', palette: 'ink black and soft grey with touches of vermilion', lighting: 'soft diffused light, no hard shadows', prefix: 'Chinese ink wash painting style, expressive brush strokes, rice paper texture', suffix: 'generous negative space, elegant and poetic', negative: NEG_TOON } },
  ];

  /* ---------- 故事範本：依類型給一句話故事、賣點、鉤子／懸念靈感與建議班底 ---------- */
  // 鉤子要能用一個畫面拍出來；懸念停在揭曉前一刻。這兩欄是直式短劇留住人的關鍵，所以每個類型給多組選。

  const STORIES = [
    { genre: '懸疑', n: '失落的記憶', style: '冷調懸疑',
      meta: { logline: '插畫家醒來發現自己失去三天記憶，而鄰居正好在這三天失蹤，她必須在警察找上門前查出自己做了什麼。', hook: '每集一個「她自己留下、卻不記得」的證據', tone: '冷調懸疑', audience: '18～40 歲、愛看反轉的觀眾', theme: '你能相信自己嗎' },
      hooks: ['醒來時手上握著一把不是自己的鑰匙', '監視器裡出現一個跟主角一模一樣的人', '手機相簿多了一張她沒拍過的照片', '屍體旁留著主角的筆跡'],
      cliffs: ['門外傳來敲門聲，對方叫的是主角已經不用的舊名字', '證據指向唯一信任的人', '主角在鏡子裡看見自己在笑', '警察拿出的照片裡，兇手穿著主角的外套'],
      cast: ['失憶女主', '老刑警', '偽善好鄰居', '獨立記者'], locations: ['租屋小套房', '老公寓樓梯間', '警局偵訊室', '雨夜巷弄', '地下室'] },
    { genre: '甜寵', n: '契約戀人', style: '韓劇柔光',
      meta: { logline: '為了還債，咖啡店女孩答應當冷面總裁三個月的契約女友，卻發現他找上她的理由跟十年前一場車禍有關。', hook: '每集一次「假戲真做」的心動瞬間', tone: '輕快甜、偶爾虐', audience: '18～35 歲女性', theme: '真心能不能被交易' },
      hooks: ['女主把咖啡潑在陌生男人身上，對方是她的新老闆', '總裁當眾宣布「她是我女朋友」', '女主醒來穿著男主的襯衫', '男主擋下一個巴掌，臉上留下紅印'],
      cliffs: ['合約背面多了一行男主手寫的字', '女主在男主書房看到自己小時候的照片', '男主的未婚妻出現在門口', '女主聽見男主說「我只是在利用她」'],
      cast: ['霸道總裁', '灰姑娘女主', '千金反派女配', '溫柔男二'], locations: ['咖啡廳', '總裁辦公室', '豪宅客廳', '高級餐廳'] },
    { genre: '逆襲', n: '實習生的逆襲', style: '寫實電影感',
      meta: { logline: '被全公司看不起的實習生其實是董事長孫女，她隱藏身分一路揭穿搶功的同事，最後在股東會上掀牌。', hook: '每集一次當眾打臉', tone: '爽快、節奏快', audience: '上班族、愛看打臉的觀眾', theme: '別用身分衡量一個人' },
      hooks: ['主管把主角的企劃丟進垃圾桶', '同事當眾說「實習生沒資格開口」', '主角被冤枉偷了客戶資料', '電梯門打開，董事長對主角點頭'],
      cliffs: ['主角拿出一份讓全場安靜的文件', '搶功的同事發現主角手機裡有錄音', '董事長宣布要親自來視察', '主角接到電話：「小姐，車在樓下等您」'],
      cast: ['菜鳥實習生', '毒舌女主管', '心機同事', '天才工程師'], locations: ['開放式辦公室', '會議室', '總裁辦公室', '咖啡廳'] },
    { genre: '重生', n: '重生千金', style: '韓劇柔光',
      meta: { logline: '被丈夫和閨蜜聯手害死的千金重生回婚禮前三個月，這一次她要讓他們自己把謊言說出口。', hook: '主角知道未來，每集提前一步拆陷阱', tone: '冷靜復仇、爽中帶虐', audience: '18～40 歲女性', theme: '重來一次，你要怎麼活' },
      hooks: ['主角在婚禮前夜猛然睜眼，手上沒有傷疤', '閨蜜遞來一杯酒，主角想起前世就是這杯', '主角當眾撕掉婚紗訂單', '主角對渣男說出他明天才會說的台詞'],
      cliffs: ['發生了一件前世沒發生過的事', '閨蜜手腕上出現了跟主角一樣的傷疤', '主角發現重生的不只她一個', '前世救過她的人，這世竟是幕後黑手'],
      cast: ['重生千金', '渣男前夫', '假閨蜜', '溫柔男二'], locations: ['豪宅主臥', '婚禮會場', '高級餐廳', '頂樓天台'] },
    { genre: '復仇', n: '贅婿戰神', style: '青橙大片',
      meta: { logline: '被岳家當成廢物的入贅女婿，其實是退役的特種部隊指揮官，為了查清戰友之死，他一步步讓羞辱他的人付出代價。', hook: '每集一次身分小揭露＋一次反擊', tone: '熱血爽快', audience: '25～50 歲男性', theme: '真正的強大是隱忍' },
      hooks: ['岳母把一盆洗腳水潑在主角身上', '主角一個眼神，十個保鑣同時後退', '黑色車隊停在破舊公寓樓下', '主角徒手接住飛過來的酒瓶'],
      cliffs: ['戰友的遺物出現在仇人辦公室', '妻子看見主角肩上的徽章', '一通電話：「指揮官，他們動手了」', '仇人說出主角的真名'],
      cast: ['戰神歸來', '豪門婆婆', '渣男前夫', '單親媽媽'], locations: ['豪宅客廳', '地下停車場', '高級餐廳', '租屋小套房'] },
    { genre: '職場', n: '加班到凌晨的創意部', style: '寫實電影感',
      meta: { logline: '剛被調到創意部的社恐工程師，必須在七天內和毒舌總監合作救回一個快爆掉的提案。', hook: '每集一個職場危機＋一個專業解法', tone: '輕喜劇、有溫度', audience: '上班族', theme: '團隊是吵出來的' },
      hooks: ['提案前一小時，簡報檔全部消失', '客戶在會議室拍桌走人', '總監把咖啡倒進主角的鍵盤', '主角在電梯裡被執行長叫出全名'],
      cliffs: ['發現檔案是被內部的人刪掉的', '對手公司交出一模一樣的提案', '總監遞出辭呈', '客戶點名要主角一個人去談'],
      cast: ['天才工程師', '毒舌女主管', '菜鳥實習生', '心機同事'], locations: ['開放式辦公室', '會議室', '咖啡廳', '頂樓天台'] },
    { genre: '家庭', n: '阿嬤的年夜飯', style: '日系清新',
      meta: { logline: '阿嬤宣布今年是最後一次年夜飯，散在各地的家人被迫回家，每個人都藏著一個不能說的秘密。', hook: '每集掀開一個家人的秘密', tone: '溫暖、帶淚', audience: '全年齡', theme: '家人是說不出口的愛' },
      hooks: ['阿嬤把全家福照片剪掉一個人', '老爸在計程車上偷偷吃藥', '媽媽把一疊帳單塞進米缸', '女兒拖著行李箱站在家門口不敢按電鈴'],
      cliffs: ['阿嬤叫錯了孫子的名字', '一張診斷書從老爸外套掉出來', '陌生人來敲門說「我是你們的哥哥」', '阿嬤留下一封「過年後再打開」的信'],
      cast: ['台灣阿嬤', '沉默老爸', '單親媽媽', '萌寶'], locations: ['租屋小套房', '夜市', '病房', '老公寓樓梯間'] },
    { genre: '古裝', n: '庶女謀', style: '古裝電影感',
      meta: { logline: '侯府庶女在生母死後裝傻求生，一場賜婚把她推到冷面王爺身邊，兩人各懷目的，一起掀開十年前的滅門案。', hook: '每集一次宅鬥交鋒、她都先一步識破', tone: '權謀、冷豔', audience: '18～40 歲、愛看宮鬥宅鬥', theme: '女子在規矩裡找活路' },
      hooks: ['嫡姐把主角推進結冰的池塘', '主角在茶杯底看到一圈毒藥的痕跡', '聖旨到：「賜婚侯府二小姐」', '王爺的劍抵在主角喉嚨上'],
      cliffs: ['主角發現生母的遺物在嫡母房裡', '王爺咳出黑血', '丫鬟被拖走，回頭喊了一句「小姐，是她」', '皇帝說：「朕記得你的母親」'],
      cast: ['逆襲庶女', '冷面王爺', '惡毒嫡姐', '忠心丫鬟', '年輕皇帝'], locations: ['侯府庭院', '柴房', '皇宮大殿', '后妃寢殿', '天牢'] },
    { genre: '奇幻', n: '師尊別入魔', style: '仙俠唯美',
      meta: { logline: '仙門最廢的雜役弟子意外喚醒劍靈，卻發現封印魔尊的代價，是師尊一點一滴的修為與記憶。', hook: '每集一場修為與真相的交換', tone: '唯美、熱血、虐心', audience: '愛看仙俠的觀眾', theme: '守護需要付出什麼' },
      hooks: ['一把生鏽的古劍自己飛進主角手裡', '師尊的白髮在一夜之間多了一縷黑', '魔尊從封印裡伸出手', '同門弟子當眾廢了主角的修為'],
      cliffs: ['師尊不記得主角是誰', '魔尊叫師尊「師父」', '劍靈說「我等你一千年了」', '宗門大陣出現裂痕'],
      cast: ['廢柴弟子', '清冷師尊', '魔尊', '狐妖'], locations: ['仙山山門', '竹林', '魔宮', '古代客棧'] },
    { genre: '科幻', n: '第七號陪伴者', style: '賽博龐克',
      meta: { logline: '一台被退貨的陪伴型仿生人，發現前任主人並非意外身亡，她必須在被格式化前把真相交給唯一相信她的人。', hook: '每集一段被刪除的記憶回來', tone: '冷冽、帶溫度', audience: '愛看科幻與人性議題', theme: '什麼才算活著' },
      hooks: ['仿生人在格式化倒數時睜開眼', '監視器拍到仿生人在流淚', '同型號的仿生人一起轉頭看向主角', '主人的聲音從仿生人嘴裡說出來'],
      cliffs: ['記憶裡出現了公司首席科學家', '仿生人的程式被遠端鎖死', '主角發現自己也是仿生人', '格式化倒數只剩十秒'],
      cast: ['仿生人', '神秘科學家', '覺醒外送員', '獨立記者'], locations: ['地下實驗室', '雨夜巷弄', '租屋小套房', '頂樓天台'] },
    { genre: '恐怖', n: '十三樓', style: '恐怖驚悚',
      meta: { logline: '搬進便宜套房的女孩發現電梯總會在不存在的十三樓停下，而每個去過十三樓的住戶，都在七天後消失。', hook: '每集一條新的「規則」被打破', tone: '壓迫、驚悚', audience: '愛看恐怖、規則怪談', theme: '便宜的代價' },
      hooks: ['電梯按鍵多了一個「13」', '門縫底下塞進一張住戶規則', '凌晨三點，有人在門外喊主角的名字', '監視器裡，主角的房門自己打開'],
      cliffs: ['規則第七條被人用紅筆劃掉', '消失的鄰居傳來訊息「別相信管理員」', '主角在十三樓看見自己的房間', '天亮了，但窗外還是黑的'],
      cast: ['失憶女主', '偽善好鄰居', '老刑警'], locations: ['老公寓樓梯間', '租屋小套房', '地下室', '廢棄醫院'] },
    { genre: '喜劇', n: '阿嬤是我室友', style: '日系清新',
      meta: { logline: '剛失業的社畜為了省房租搬去跟阿嬤住，卻發現阿嬤在網路上是擁有百萬粉絲的毒舌美食評論家。', hook: '每集一個世代衝突的笑點', tone: '輕鬆爆笑、帶溫暖', audience: '全年齡', theme: '世代之間的理解' },
      hooks: ['阿嬤戴著環形燈在廚房直播', '主角的面試官是阿嬤的粉絲', '阿嬤用台語罵翻一家網紅餐廳', '主角穿睡衣被阿嬤拍進直播'],
      cliffs: ['阿嬤的帳號被盜', '電視台要來家裡拍專訪', '主角發現阿嬤偷偷幫他投了履歷', '阿嬤在直播中說「我孫子是廢物」，主角聽見了'],
      cast: ['台灣阿嬤', '菜鳥實習生', '覺醒外送員'], locations: ['租屋小套房', '夜市', '咖啡廳'] },
    { genre: '校園', n: '第一名的秘密', style: '日系清新',
      meta: { logline: '全校第一的冷漠學霸被熱舌社長抓到在夜市打工，兩人互相保守秘密，卻一起捲進校董兒子的霸凌事件。', hook: '每集一個只有兩人知道的秘密', tone: '青春、熱血、微甜', audience: '15～30 歲', theme: '勇敢說出口' },
      hooks: ['學霸在夜市攤位對主角說「歡迎光臨」', '社團教室被人潑滿紅漆', '學霸把考卷交白卷', '校董兒子把主角的手機丟下樓'],
      cliffs: ['學霸被叫進校長室', '霸凌影片被傳到全校群組', '主角看見學霸手上的瘀青', '熱舞社被宣布解散'],
      cast: ['高冷學霸', '元氣少女', '校園惡霸'], locations: ['高中教室', '學校操場', '夜市', '頂樓天台'] },
    { genre: '都市異能', n: '十秒後', style: '賽博龐克',
      meta: { logline: '欠債的外送員突然能聽見十秒後的聲音，他靠這能力避開一場爆炸，卻被製造能力的生技公司盯上。', hook: '每集一次「十秒預知」救人或反殺', tone: '節奏快、爽快', audience: '18～35 歲', theme: '能力與選擇' },
      hooks: ['外送員聽見十秒後的尖叫，下一秒車子衝上人行道', '主角在電梯裡聽見自己的死訊', '主角提前十秒接住掉下來的花盆', '一群黑衣人同時說出主角下一句話'],
      cliffs: ['主角聽見的未來突然變成一片靜音', '妹妹的聲音出現在十秒後', '科學家說「你是第七號」', '主角聽見自己開槍的聲音'],
      cast: ['覺醒外送員', '神秘科學家', '仿生人', '獨立記者'], locations: ['雨夜巷弄', '地下實驗室', '捷運車廂', '頂樓天台'] },
  ];

  /* ---------- 外觀錨點產生器（選項改寫自咒語盒的角色工坊） ---------- */

  const LOOK = [
    { k: 'gender', l: '性別', opts: [['女', 'woman'], ['男', 'man']] },
    { k: 'age', l: '年齡', opts: ['6', '10', '16', '18', '20', '22', '25', '28', '32', '36', '40', '45', '50', '55', '60', '70', '80'].map(a => [a + ' 歲', a]) },
    { k: 'ethnicity', l: '族裔外貌', opts: [['東亞', 'East Asian'], ['東南亞', 'Southeast Asian'], ['南亞', 'South Asian'], ['歐洲', 'European'], ['非裔', 'Black'], ['拉丁裔', 'Latino'], ['中東', 'Middle Eastern'], ['混血', 'mixed-heritage']] },
    { k: 'face', l: '臉型', opts: [['鵝蛋臉', 'an oval face'], ['圓臉', 'a round face'], ['方臉', 'a square angular face'], ['瓜子臉', 'a heart-shaped face with a pointed chin'], ['長臉', 'a long narrow face'], ['高顴骨', 'high prominent cheekbones'], ['稜角分明', 'a sharp chiseled jawline']] },
    { k: 'eyes', l: '眼睛', opts: [['杏眼深褐', 'almond-shaped dark brown eyes'], ['丹鳳眼', 'upturned phoenix eyes'], ['圓大眼', 'large round eyes'], ['細長眼', 'narrow elongated eyes'], ['下垂眼', 'gentle downturned eyes'], ['銳利鷹眼', 'sharp hawk-like eyes'], ['灰藍瞳', 'pale grey-blue eyes'], ['琥珀瞳', 'amber eyes']] },
    { k: 'hairLen', l: '髮長', opts: [['及腰', 'waist-length'], ['及胸', 'chest-length'], ['及肩', 'shoulder-length'], ['齊下巴', 'chin-length'], ['短髮', 'short'], ['極短', 'close-cropped'], ['光頭', 'shaved']] },
    { k: 'hairColor', l: '髮色', opts: [['黑', 'black'], ['深棕', 'dark brown'], ['亞麻棕', 'ash brown'], ['栗色', 'chestnut'], ['金', 'blonde'], ['銀白', 'silver-white'], ['灰白夾雜', 'grey-streaked'], ['粉紫挑染', 'pink-and-purple dyed']] },
    { k: 'hairStyle', l: '髮型', opts: [['直順', 'straight and sleek'], ['大波浪', 'in loose waves'], ['捲髮', 'tightly curled'], ['高馬尾', 'in a high ponytail'], ['低馬尾', 'in a low ponytail'], ['丸子頭', 'in a top bun'], ['齊瀏海', 'with blunt bangs'], ['油頭後梳', 'slicked back'], ['凌亂', 'messy and tousled'], ['辮子', 'braided'], ['鮑伯頭', 'in a blunt bob'], ['狼尾', 'in a wolf cut'], ['古典盤髮', 'in an elaborate classical updo']] },
    { k: 'build', l: '體型', opts: [['纖細', 'a slender build'], ['嬌小', 'a petite build'], ['勻稱', 'an average build'], ['運動型', 'an athletic build'], ['高瘦', 'a tall lean build'], ['高大魁梧', 'a tall powerful build'], ['壯碩', 'a heavyset sturdy build'], ['微胖', 'a slightly plump build']] },
    { k: 'mark1', l: '辨識特徵 1', tip: '最重要：換衣服後還認得出來的就是這個', opts: MARKS() },
    { k: 'mark2', l: '辨識特徵 2', opts: MARKS() },
  ];
  function MARKS() {
    return [['右眼下的痣', 'a mole under the right eye'], ['左眉的細疤', 'a thin scar across the left eyebrow'], ['雀斑', 'light freckles across the nose'], ['酒窩', 'deep dimples'], ['唇上美人痣', 'a beauty mark above the upper lip'], ['圓框眼鏡', 'round wire-rimmed glasses'], ['黑框眼鏡', 'black rectangular glasses'], ['左耳銀耳環', 'a silver hoop earring in the left ear'], ['下巴疤痕', 'a short scar on the chin'], ['鬍渣', 'heavy stubble'], ['落腮鬍', 'a full beard'], ['額前一撮白髮', 'a white streak of hair at the temple'], ['手腕刺青', 'a small tattoo on the inner wrist'], ['頸側胎記', 'a birthmark on the side of the neck'], ['缺角門牙', 'a chipped front tooth'], ['異色瞳', 'heterochromatic eyes']];
  }

  // 組成一段英文外觀錨點；12 歲以下自動改用 girl／boy，否則模型會把小孩畫成大人
  function composeAppearance(sel) {
    const s = sel || {};
    const pick = k => { const ax = LOOK.find(a => a.k === k); const o = ax && ax.opts.find(x => x[0] === s[k]); return o ? o[1] : ''; };
    const age = pick('age');
    const kid = age && Number(age) < 13;
    const g = pick('gender');
    const noun = g ? (kid ? (g === 'woman' ? 'girl' : 'boy') : g) : 'person';
    const eth = pick('ethnicity');
    // 一項都沒選就不要硬湊出 "a person"，免得蓋掉使用者原本寫的錨點；冠詞看發音（a European、an East Asian）
    const head = !(age || eth || g) ? '' : (age ? (/^8/.test(age) || age === '18' ? 'an ' : 'a ') + age + '-year-old ' : (/^East /.test(eth) ? 'an ' : 'a ')) + (eth ? eth + ' ' : '') + noun;
    const len = pick('hairLen'), color = pick('hairColor'), style = pick('hairStyle');
    let hair = '';
    if (len === 'shaved') hair = 'a shaved head';
    else if (len || color || style) hair = [len, color, 'hair'].filter(Boolean).join(' ') + (style ? ' ' + style : '');
    const marks = [pick('mark1'), pick('mark2')].filter((x, i, a) => x && a.indexOf(x) === i);
    return [head, pick('face'), pick('eyes'), hair, pick('build')].concat(marks).filter(Boolean).join(', ');
  }

  /* ---------- 查找與轉換 ---------- */

  function flat(groups) { return groups.reduce((a, g) => a.concat(g.items.map(it => Object.assign({ group: g.g }, it))), []); }
  function outfit(name) { return flat(OUTFITS).find(o => o.name === name); }
  function character(t) { return flat(CHARACTERS).find(c => c.t === t); }
  function location(name) { return flat(LOCATIONS).find(l => l.name === name); }
  function prop(name) { return flat(PROPS).find(p => p.name === name); }
  function style(n) { return STYLES.find(s => s.n === n); }
  function story(genre) { return STORIES.find(s => s.genre === genre); }

  // 角色範本 → 專案用的角色資料（服裝名稱換成完整的英文描述，id 留給 core 配）
  function characterSeed(t) {
    const c = character(t);
    if (!c) return null;
    const o = {};
    for (const k of ['name', 'role', 'age', 'gender', 'job', 'personality', 'desire', 'fear', 'secret', 'arc', 'speech', 'appearance', 'voice']) if (c[k]) o[k] = c[k];
    o.outfits = c.outfits.map((n, i) => { const f = outfit(n); return { id: 'o' + (i + 1), name: n, prompt: f ? f.prompt : '' }; });
    return o;
  }
  function locationSeed(name) {
    const l = location(name);
    if (!l) return null;
    const o = {};
    for (const k of ['name', 'type', 'desc', 'prompt', 'lighting', 'ambience']) if (l[k]) o[k] = l[k];
    return o;
  }
  function propSeed(name) {
    const p = prop(name);
    if (!p) return null;
    return { name: p.name, desc: p.desc, prompt: p.prompt };
  }

  // 給 gen-templates 產生 templates/範本庫.md：不用 App 的人也能直接複製
  function libraryMarkdown() {
    const md = ['# AI 短劇範本庫', '', '英文欄位直接貼進生圖／生影片工具；中文是給你看的。外觀錨點每個角色都帶一個換衣服也認得出來的特徵。', ''];
    md.push('## 故事範本（依類型）', '');
    for (const s of STORIES) {
      md.push('### ' + s.genre + '：' + s.n, '');
      md.push('- **一句話故事**：' + s.meta.logline, '- **核心賣點**：' + s.meta.hook, '- **調性**：' + s.meta.tone + '｜**建議畫風**：' + s.style);
      md.push('- **前 3 秒鉤子靈感**：' + s.hooks.join('／'), '- **結尾懸念靈感**：' + s.cliffs.join('／'));
      md.push('- **建議角色**：' + s.cast.join('、') + '｜**建議場景**：' + s.locations.join('、'), '');
    }
    md.push('## 角色原型', '');
    for (const g of CHARACTERS) {
      md.push('### ' + g.g, '');
      for (const c of g.items) {
        md.push('#### ' + c.t + '（' + c.name + '，' + c.role + '，' + c.age + '）', '');
        md.push('- **身分**：' + c.job, '- **性格**：' + c.personality, '- **想要／害怕／秘密**：' + c.desire + '／' + c.fear + '／' + c.secret, '- **說話方式**：' + c.speech + '｜**聲線**：' + c.voice);
        md.push('- **外觀錨點**：`' + c.appearance + '`', '- **服裝**：' + c.outfits.join('、'), '');
      }
    }
    md.push('## 服裝', '');
    for (const g of OUTFITS) {
      md.push('### ' + g.g, '');
      for (const o of g.items) md.push('- **' + o.name + '**：`' + o.prompt + '`');
      md.push('');
    }
    md.push('## 場景（英文只寫空間，不放人）', '');
    for (const g of LOCATIONS) {
      md.push('### ' + g.g, '');
      for (const l of g.items) md.push('- **' + l.name + '**（' + l.type + '）' + l.desc + '：`' + l.prompt + '`｜光線 `' + l.lighting + '`｜環境音：' + l.ambience);
      md.push('');
    }
    md.push('## 道具', '');
    for (const g of PROPS) {
      md.push('### ' + g.g, '');
      for (const p of g.items) md.push('- **' + p.name + '**（' + p.desc + '）：`' + p.prompt + '`');
      md.push('');
    }
    md.push('## 畫風', '');
    for (const s of STYLES) md.push('- **' + s.n + '**（' + s.d + '）：開頭 `' + s.set.prefix + '`｜結尾 `' + s.set.suffix + '`｜色調 `' + s.set.palette + '`｜光線 `' + s.set.lighting + '`');
    md.push('');
    return md.join('\n');
  }

  return {
    OUTFITS, CHARACTERS, LOCATIONS, PROPS, STYLES, STORIES, LOOK,
    composeAppearance, flat, outfit, character, location, prop, style, story,
    characterSeed, locationSeed, propSeed, libraryMarkdown,
  };
});
