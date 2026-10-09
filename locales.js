'use strict';

const locales = {
  ar: {
    language: '🌐 اختر اللغة', welcome: 'أهلًا بك في مقرأة الإمام الجزري للإقراء والإجازة بالسند 📖\n\nاختر من القائمة ما تريد.',
    main_menu: 'القائمة الرئيسية', my_account: '👤 حسابي', balance: '💳 الرصيد والتعبئة', program: '📖 برنامجي', sessions: '⏱️ جلساتي', schedule: '📅 جدولي', settings: '⚙️ الإعدادات', contact: '☎️ التواصل مع الإدارة',
    choose_package: 'اختر باقة الدقائق التي تريد شراءها:', package_line: '{minutes} دقيقة — {price} ETB', choose_method: 'اختر طريقة الدفع. يمكنك نسخ بيانات الدفع من الرسالة التالية.', wallet: '👛 Wallet / المحفظة', bank: '🏦 Bank / البنك', telebirr: 'Telebirr', mpesa: 'M-Pesa', boa: 'BOA', cbe: 'CBE',
    payment_details: '💳 *بيانات الدفع — {method}*\n\nالمستفيد: {accountName}\n\n```\n{details}\n```\n\n📌 انسخ رقم الحساب أعلاه، ثم ادفع المبلغ: *{price} ETB* لشراء *{minutes} دقيقة*.\n\nبعد الدفع، أرسل صورة الإيصال أو ملفه هنا. سيُراجع المشرف الطلب قبل إضافة الرصيد.',
    send_receipt: 'أرسل إيصال الدفع الآن كصورة أو ملف PDF. لإلغاء الطلب اكتب /cancel.', receipt_received: '✅ تم استلام إيصالك وإنشاء طلب التعبئة رقم: {id}\nسيتم إشعارك بعد مراجعة المشرف.', cancelled: 'تم إلغاء العملية الحالية.',
    account: '👤 *حسابك*\nالكود: {code}\nالاسم: {name}\nالرصيد: {balance} دقيقة\nإجمالي ما اشتريته: {purchased} دقيقة\nإجمالي ما استهلكته: {used} دقيقة', no_account: 'لم يكتمل تسجيل حسابك بعد. أرسل /start للبدء.',
    ask_name: 'للتسجيل، أرسل اسمك الكامل.', registered: '✅ تم إنشاء حسابك بنجاح.\nكود الطالب: {code}\n🎁 أُضيفت إلى حسابك هدية ترحيبية مجانية قدرها {bonus} دقيقة.\nبارك الله فيك ونفع بك.',
    receipt_prompt: 'أرسل إيصال الدفع كصورة أو ملف.', admin_payment: '💳 طلب تعبئة جديد\nالطلب: {id}\nالطالب: {code} — {name}\nالباقة: {minutes} دقيقة مقابل {price} ETB\nالطريقة: {method}\nللموافقة: /approve {id}\nللرفض: /reject {id}',
    approved: '✅ تمت الموافقة على التعبئة {id}. أُضيفت {minutes} دقيقة إلى رصيد الطالب.', rejected: 'تم رفض طلب التعبئة {id}. يُرجى التواصل مع الإدارة إذا كنت ترى أن ذلك خطأ.',
    recharge_ok: '✅ تمت تعبئة رصيدك بنجاح.\nالدقائق المضافة: {minutes}\nالرصيد الحالي: {balance} دقيقة.\nبارك الله فيك.', unauthorized: 'عذرًا، هذا الأمر مخصص للمشرفين.', bad_command: 'صيغة الأمر غير صحيحة. مثال: /deduct IF-0001 20', deducted: '✅ تم تسجيل جلسة الإقراء.\nمدة الجلسة: {used} دقيقة\nالرصيد السابق: {before} دقيقة\nالدقائق المستخدمة: {used} دقيقة\nالرصيد الحالي: {after} دقيقة\nبارك الله فيك ونفع الله بك.',
    broadcast_prompt: 'أرسل الرسالة التي تريد تعميمها على المستخدمين.', broadcast_done: 'اكتمل التعميم. تم الإرسال إلى {sent} مستخدم، وتعذر الإرسال إلى {failed}.', generic_error: '❌ حدث خطأ. يرجى المحاولة مرة أخرى أو التواصل مع الإدارة.',
    choose_language: 'اختر اللغة:', language_saved: 'تم تحديث اللغة بنجاح.', payment_methods: 'طرق الدفع', pending: 'قيد المراجعة', unknown_package: 'هذه الباقة غير متاحة.', low_balance: 'رصيد الطالب لا يكفي لهذا الخصم.',
    program_info: 'برامج المقرأة: التلقين وتيسير الأداء، حفظ القرآن الكريم، والإجازة بالقراءات والإقراء. تواصل مع الإدارة لتحديد البرنامج المناسب.', sessions_info: 'يمكنك مراجعة سجل جلساتك لدى المشرف. ستصلك رسالة بعد تسجيل كل جلسة.', schedule_info: 'الذكور: الثلاثاء والأربعاء والخميس. الإناث: السبت والأحد والاثنين. الجمعة إجازة. الفترات: صباحية 09:00–12:00، بعد الظهر 14:00–15:30، ليلية 21:00–23:00. يتم تأكيد مجموعتك من الإدارة.',
    settings_info: 'لتغيير اللغة استخدم /language.',
  },
  am: {
    language: '🌐 ቋንቋ ይምረጡ', welcome: 'ወደ ኢማም አልጀዘሪ የቁርአን ንባብና ኢጃዛህ መቅራአ እንኳን በደህና መጡ 📖\n\nከታች ያለውን ምናሌ ይጠቀሙ።',
    main_menu: 'ዋና ምናሌ', my_account: '👤 የእኔ መለያ', balance: '💳 ቀሪ ሂሳብና መሙያ', program: '📖 ፕሮግራሜ', sessions: '⏱️ የንባብ ክፍለ ጊዜዎቼ', schedule: '📅 የጊዜ ሰሌዳዬ', settings: '⚙️ ቅንብሮች', contact: '☎️ አስተዳደሩን ያግኙ',
    choose_package: 'መግዛት የሚፈልጉትን የደቂቃ ጥቅል ይምረጡ:', package_line: '{minutes} ደቂቃ — {price} ETB', choose_method: 'የክፍያ ዘዴ ይምረጡ። ከሚቀጥለው መልእክት የክፍያ መረጃውን መቅዳት ይችላሉ።', wallet: '👛 Wallet / የኤሌክትሮኒክ ቦርሳ', bank: '🏦 Bank / ባንክ', telebirr: 'Telebirr', mpesa: 'M-Pesa', boa: 'BOA', cbe: 'CBE',
    payment_details: '💳 *የክፍያ መረጃ — {method}*\n\nየተቀባይ ስም: {accountName}\n\n```\n{details}\n```\n\n📌 ከላይ ያለውን ቁጥር ይቅዱ፤ *{minutes} ደቂቃ* ለመግዛት *{price} ETB* ይክፈሉ።\n\nከከፈሉ በኋላ የክፍያ ደረሰኙን እንደ ፎቶ ወይም PDF ይላኩ። አስተዳደሩ ካረጋገጠ በኋላ ሂሳቡ ይጨመራል።',
    send_receipt: 'አሁን የክፍያ ደረሰኙን እንደ ፎቶ ወይም PDF ይላኩ። ለመሰረዝ /cancel ይጻፉ።', receipt_received: '✅ የክፍያ ደረሰኙ ደርሶናል። የጥያቄ ቁጥር: {id}\nከአስተዳደሩ ማረጋገጫ በኋላ እናሳውቅዎታለን።', cancelled: 'የአሁኑ ሂደት ተሰርዟል።',
    account: '👤 *የእርስዎ መለያ*\nኮድ: {code}\nስም: {name}\nቀሪ ሂሳብ: {balance} ደቂቃ\nየተገዙ ደቂቃዎች: {purchased}\nየተጠቀሙ ደቂቃዎች: {used}', no_account: 'መለያዎ ገና አልተመዘገበም። ለመጀመር /start ይጫኑ።',
    ask_name: 'ለመመዝገብ ሙሉ ስምዎን ይላኩ።', registered: '✅ መለያዎ በተሳካ ሁኔታ ተፈጥሯል።\nየተማሪ ኮድ: {code}\n🎁 {bonus} ነፃ የንባብ ደቂቃዎች እንደ የእንኳን ደህና መጡ ስጦታ ተጨምረዋል።\nአላህ ይባርክዎ።',
    receipt_prompt: 'የክፍያ ደረሰኙን እንደ ፎቶ ወይም PDF ይላኩ።', admin_payment: '💳 አዲስ የመሙያ ጥያቄ\nጥያቄ: {id}\nተማሪ: {code} — {name}\nጥቅል: {minutes} ደቂቃ ለ {price} ETB\nዘዴ: {method}\nለማጽደቅ: /approve {id}\nለመከልከል: /reject {id}',
    approved: '✅ የመሙያ ጥያቄ {id} ጸድቋል። {minutes} ደቂቃ ተጨምረዋል።', rejected: 'የመሙያ ጥያቄ {id} ተከልክሏል። ጥያቄ ካለዎት አስተዳደሩን ያግኙ።',
    recharge_ok: '✅ ሂሳብዎ በተሳካ ሁኔታ ተሞልቷል።\nየተጨመሩ ደቂቃዎች: {minutes}\nአሁን ያለው ሂሳብ: {balance} ደቂቃ።', unauthorized: 'ይቅርታ፣ ይህ ትእዛዝ ለአስተዳዳሪዎች ብቻ ነው።', bad_command: 'የትእዛዙ ቅርጽ ትክክል አይደለም። ምሳሌ: /deduct IF-0001 20', deducted: '✅ የንባብ ክፍለ ጊዜ ተመዝግቧል።\nየክፍለ ጊዜ ርዝመት: {used} ደቂቃ\nቀድሞ ሂሳብ: {before} ደቂቃ\nየተቀነሱ: {used} ደቂቃ\nአሁን ያለው: {after} ደቂቃ። አላህ ይባርክዎ።',
    broadcast_prompt: 'ለሁሉም ተጠቃሚዎች ማስተላለፍ የሚፈልጉትን መልእክት ይላኩ።', broadcast_done: 'ማስተላለፉ ተጠናቋል። ተልኳል: {sent}፣ አልተሳካም: {failed}.', generic_error: '❌ ስህተት ተፈጥሯል። እባክዎ እንደገና ይሞክሩ ወይም አስተዳደሩን ያግኙ።', choose_language: 'ቋንቋ ይምረጡ:', language_saved: 'ቋንቋው ተቀይሯል።', payment_methods: 'የክፍያ ዘዴዎች', pending: 'በማረጋገጫ ላይ', unknown_package: 'ይህ ጥቅል አይገኝም።', low_balance: 'ለዚህ ቅነሳ የተማሪው ሂሳብ በቂ አይደለም።',
    program_info: 'የመቅራአው ፕሮግራሞች፦ ተልቂንና የንባብ ማሻሻያ፣ የቁርአን ሒፍዝ፣ ኢጃዛህና ቂራአት። ተስማሚውን ፕሮግራም ለመምረጥ አስተዳደሩን ያግኙ።', sessions_info: 'ከእያንዳንዱ የንባብ ክፍለ ጊዜ በኋላ ማሳወቂያ ይደርስዎታል።', schedule_info: 'ወንዶች፦ ማክሰኞ፣ ረቡዕ፣ ሐሙስ። ሴቶች፦ ቅዳሜ፣ እሁድ፣ ሰኞ። ዓርብ ዕረፍት ነው። ጠዋት 09:00–12:00፣ ከሰዓት 14:00–15:30፣ ማታ 21:00–23:00። ቡድንዎን አስተዳደሩ ያረጋግጣል።', settings_info: 'ቋንቋን ለመቀየር /language ይጠቀሙ።'
  },
  en: {
    language: '🌐 Choose your language', welcome: 'Welcome to Maqra’at Al-Imam Al-Jazari for Quran Recitation and Ijazah with Sanad 📖\n\nPlease choose an option below.',
    main_menu: 'Main menu', my_account: '👤 My Account', balance: '💳 Balance & Recharge', program: '📖 My Program', sessions: '⏱️ My Sessions', schedule: '📅 My Schedule', settings: '⚙️ Settings', contact: '☎️ Contact Administration',
    choose_package: 'Choose the minute package you would like to purchase:', package_line: '{minutes} minutes — {price} ETB', choose_method: 'Choose a payment method. You can copy the payment details from the next message.', wallet: '👛 Wallet', bank: '🏦 Bank', telebirr: 'Telebirr', mpesa: 'M-Pesa', boa: 'BOA', cbe: 'CBE',
    payment_details: '💳 *Payment details — {method}*\n\nAccount name: {accountName}\n\n```\n{details}\n```\n\n📌 Copy the account number above and pay *{price} ETB* for *{minutes} minutes*.\n\nAfter payment, send the receipt here as a photo or PDF. The supervisor will verify it before adding your minutes.',
    send_receipt: 'Please send your payment receipt now as a photo or PDF. Send /cancel to cancel.', receipt_received: '✅ Your receipt was received. Recharge request: {id}\nYou will be notified after the supervisor reviews it.', cancelled: 'The current operation has been cancelled.',
    account: '👤 *Your account*\nStudent code: {code}\nName: {name}\nCurrent balance: {balance} minutes\nTotal purchased: {purchased} minutes\nTotal used: {used} minutes', no_account: 'Your account is not registered yet. Send /start to begin.',
    ask_name: 'To register, please send your full name.', registered: '✅ Your account has been created.\nStudent code: {code}\n🎁 You received a welcome gift of {bonus} free recitation minutes.\nMay Allah bless you and make you beneficial.',
    receipt_prompt: 'Send your payment receipt as a photo or PDF.', admin_payment: '💳 New recharge request\nRequest: {id}\nStudent: {code} — {name}\nPackage: {minutes} minutes for {price} ETB\nMethod: {method}\nApprove: /approve {id}\nReject: /reject {id}',
    approved: '✅ Recharge request {id} approved. {minutes} minutes have been added.', rejected: 'Recharge request {id} was rejected. Please contact administration if you believe this is a mistake.',
    recharge_ok: '✅ Your balance was recharged successfully.\nMinutes added: {minutes}\nCurrent balance: {balance} minutes.\nMay Allah bless you.', unauthorized: 'Sorry, this command is for supervisors only.', bad_command: 'Invalid command format. Example: /deduct IF-0001 20', deducted: '✅ Recitation session recorded.\nSession duration: {used} minutes\nPrevious balance: {before} minutes\nMinutes used: {used}\nCurrent balance: {after} minutes.\nMay Allah bless you and make you beneficial.',
    broadcast_prompt: 'Send the message you want to broadcast to all users.', broadcast_done: 'Broadcast complete. Sent: {sent}; failed: {failed}.', generic_error: '❌ An error occurred. Please try again or contact administration.', choose_language: 'Choose your language:', language_saved: 'Language updated successfully.', payment_methods: 'Payment methods', pending: 'Pending review', unknown_package: 'This package is unavailable.', low_balance: 'The student does not have enough balance for this deduction.',
    program_info: 'Center programs: Talqin and recitation improvement, Quran memorization, and Ijazah/Qira’at. Contact administration to choose the right program.', sessions_info: 'You will receive a notification after each session is recorded. Contact your supervisor for your session history.', schedule_info: 'Men: Tuesday, Wednesday, Thursday. Women: Saturday, Sunday, Monday. Friday is the weekly day off. Morning 09:00–12:00, afternoon 14:00–15:30, night 21:00–23:00. Administration will confirm your assigned group.', settings_info: 'Use /language to change your preferred language.'
  }
};

function t(language, key, vars = {}) {
  const lang = locales[language] ? language : 'ar';
  let value = locales[lang][key] ?? locales.en[key] ?? locales.ar[key] ?? key;
  for (const [name, replacement] of Object.entries(vars)) value = value.replaceAll(`{${name}}`, String(replacement));
  return value;
}
module.exports = { locales, t };
