from app.models.users import RoleEnum

ROLE_DEFAULT_PERMISSIONS = {

    RoleEnum.kassir: {

        # SOTUV
        "sotish": True,                    # Sotuv qilish
        "narx_ozgartirish": False,         # Sotuvda narx o'zgartirish (bazaga ta'siri yo'q)
        "mahsulot_chegirma": False,        # Bitta mahsulotga foiz chegirma
        "umumiy_chegirma": False,          # Umumiy summaga chegirma
        "qaytarish": False,                # Mahsulotni qaytarib olish

        # SAVATCHA
        "savatdan_ochirish": True,         # Bitta mahsulotni savatchadan o'chirish
        "savatchani_tozalash": True,       # Barcha savatchani tozalash

        # MAHSULOTLAR
        "mahsulot_royxati": True,          # Barcha mahsulotlarni ko'rish
        "mahsulot_qidirish": True,         # Nom, ID, shtrix kod orqali qidirish
        "narx_yorligi": True,              # Kassa page dan narx yorlig'i chiqarish

        # MIJOZLAR
        "mijoz_royxati": True,             # Barcha mijozlarni ko'rish + search
        "mijoz_tarixi": True,              # Mijoz nima sotib olganini ko'rish
        "mijoz_tahrirlash": False,         # Mijoz ism/nomerini o'zgartirish
        "mijoz_ochirish": False,           # Mijozni o'chirish

        # CHECKLAR
        "check_royxati": True,             # Barcha checklarni ko'rish + search
        "check_korish": True,              # Bitta checkni to'liq ko'rish

        # OMBOR
        "ombor_tasdiqlash": True,          # Ombordan kassaga yuborilgan mahsulotlarni tasdiqlash

        # HISOBOT
        "hisobot_korish": False,           # Hisobotlarni ko'rish

        # BOSHQARUV
        "xodim_boshqarish": False,         # Xodimlarni boshqarish
    },


        # SKLADCHI

    RoleEnum.skladchi: {

        # OMBOR
        "ombor_royxati": True,             # Ombordagi barcha mahsulotlarni ko'rish
        "ombor_qidirish": True,            # Mahsulot qidirish (nom, ID, shtrix kod)
        "mahsulot_kiritish": True,         # Omborga yangi mahsulot kiritish
                                           # (nomi, soni, kirim narxi, sana)
        "kassaga_yuborish": True,          # Ombordan kassaga mahsulot yuborish

        # SOTUV
        "sotish": False,                   # Sotuv qilish
        "narx_ozgartirish": False,         # Narx o'zgartirish
        "mahsulot_chegirma": False,        # Chegirma berish
        "umumiy_chegirma": False,          # Umumiy summaga chegirma
        "qaytarish": False,                # Mahsulot qaytarish

        # SAVATCHA
        "savatdan_ochirish": False,        # Savatchadan o'chirish
        "savatchani_tozalash": False,      # Savatchani tozalash

        # MAHSULOTLAR
        "mahsulot_royxati": True,          # Barcha mahsulotlarni ko'rish
        "mahsulot_qidirish": True,         # Nom, ID, shtrix kod orqali qidirish
        "narx_yorligi": False,             # Narx yorlig'i chiqarish

        # MIJOZLAR
        "mijoz_royxati": False,            # Mijozlarni ko'rish
        "mijoz_tarixi": False,             # Mijoz tarixi
        "mijoz_tahrirlash": False,         # Mijoz ma'lumotlarini tahrirlash
        "mijoz_ochirish": False,           # Mijozni o'chirish

        # CHECKLAR
        "check_royxati": False,            # Checklarni ko'rish
        "check_korish": False,             # Bitta checkni ko'rish

        # OMBOR TASDIQLASH
        "ombor_tasdiqlash": False,         # Ombordan kassaga yuborilganini tasdiqlash

        # HISOBOT
        "hisobot_korish": False,           # Hisobotlarni ko'rish

        # BOSHQARUV
        "xodim_boshqarish": False,         # Xodimlarni boshqarish

    },


    RoleEnum.operator: {

        # SOTUV
        "sotish": False,
        "narx_ozgartirish": False,
        "mahsulot_chegirma": False,
        "umumiy_chegirma": False,
        "qaytarish": False,

        # SAVATCHA
        "savatdan_ochirish": False,
        "savatchani_tozalash": False,

        # MAHSULOTLAR
        "mahsulot_royxati": False,
        "mahsulot_qidirish": False,
        "narx_yorligi": False,

        # MIJOZLAR
        "mijoz_royxati": True,         # Kassir qo'shgan mijozlarni ko'rish + search
        "mijoz_tarixi": True,          # Mijoz xizmat tarixini ko'rish
        "mijoz_tahrirlash": False,
        "mijoz_ochirish": False,

        # CHECKLAR
        "check_royxati": False,
        "check_korish": False,

        # OMBOR
        "ombor_royxati": False,
        "ombor_qidirish": False,
        "mahsulot_kiritish": False,
        "kassaga_yuborish": False,
        "ombor_tasdiqlash": False,

        # MIJOZ ESLATMA
        "eslatma_qoshish": True,       # Mijozga eslatma yozish
        "yaqin_sanalar": True,         # Sanasi yaqinlashgan mijozlar ro'yxati

        # HISOBOT
        "hisobot_korish": False,

        # BOSHQARUV
        "xodim_boshqarish": False,
    },



    # Qolganlar keyinroq...

    RoleEnum.admin: {

        # SOTUV
        "sotish": True,
        "narx_ozgartirish": True,
        "mahsulot_chegirma": True,
        "umumiy_chegirma": True,
        "qaytarish": True,

        # SAVATCHA
        "savatdan_ochirish": True,
        "savatchani_tozalash": True,

        # MAHSULOTLAR
        "mahsulot_royxati": True,
        "mahsulot_qidirish": True,
        "narx_yorligi": True,

        # MIJOZLAR
        "mijoz_royxati": True,
        "mijoz_tarixi": True,
        "mijoz_tahrirlash": True,
        "mijoz_ochirish": True,

        # CHECKLAR
        "check_royxati": True,
        "check_korish": True,

        # OMBOR
        "ombor_royxati": True,
        "ombor_qidirish": True,
        "mahsulot_kiritish": True,
        "kassaga_yuborish": True,
        "ombor_tasdiqlash": True,

        # MIJOZ ESLATMA
        "eslatma_qoshish": True,
        "yaqin_sanalar": True,

        # HISOBOT
        "hisobot_korish": True,

        # BOSHQARUV
        "xodim_boshqarish": False,     # Faqat superadmin!
    },


    RoleEnum.superadmin: {

        # SOTUV
        "sotish": True,
        "narx_ozgartirish": True,
        "mahsulot_chegirma": True,
        "umumiy_chegirma": True,
        "qaytarish": True,

        # SAVATCHA
        "savatdan_ochirish": True,
        "savatchani_tozalash": True,

        # MAHSULOTLAR
        "mahsulot_royxati": True,
        "mahsulot_qidirish": True,
        "narx_yorligi": True,

        # MIJOZLAR
        "mijoz_royxati": True,
        "mijoz_tarixi": True,
        "mijoz_tahrirlash": True,
        "mijoz_ochirish": True,

        # CHECKLAR
        "check_royxati": True,
        "check_korish": True,

        # OMBOR
        "ombor_royxati": True,
        "ombor_qidirish": True,
        "mahsulot_kiritish": True,
        "kassaga_yuborish": True,
        "ombor_tasdiqlash": True,

        # MIJOZ ESLATMA
        "eslatma_qoshish": True,
        "yaqin_sanalar": True,

        # HISOBOT
        "hisobot_korish": True,

        # BOSHQARUV
        "xodim_boshqarish": True,      # Faqat superadmin! ✅
    },


RoleEnum.kontragent: {
    # Faqat o'z kirimlarini va qarzlarini ko'radi
    "sotish": False,
    "narx_ozgartirish": False,
    "mahsulot_chegirma": False,
    "umumiy_chegirma": False,
    "qaytarish": False,
    "savatdan_ochirish": False,
    "savatchani_tozalash": False,
    "mahsulot_royxati": False,
    "mahsulot_qidirish": False,
    "narx_yorligi": False,
    "mijoz_royxati": False,
    "mijoz_tarixi": False,
    "mijoz_tahrirlash": False,
    "mijoz_ochirish": False,
    "check_royxati": False,
    "check_korish": False,
    "ombor_royxati": False,
    "ombor_qidirish": False,
    "mahsulot_kiritish": False,
    "kassaga_yuborish": False,
    "ombor_tasdiqlash": False,
    "eslatma_qoshish": False,
    "yaqin_sanalar": False,
    "hisobot_korish": False,
    "xodim_boshqarish": False,
},

RoleEnum.buxgalter: {
    # Faqat moliyaviy hisob-kitob bilan shug'ullanadi — kassadan pul yig'ish, Sef, hisobotlar
    "sotish": False,
    "narx_ozgartirish": False,
    "mahsulot_chegirma": False,
    "umumiy_chegirma": False,
    "qaytarish": False,
    "savatdan_ochirish": False,
    "savatchani_tozalash": False,
    "mahsulot_royxati": False,
    "mahsulot_qidirish": False,
    "narx_yorligi": False,
    "mijoz_royxati": False,
    "mijoz_tarixi": False,
    "mijoz_tahrirlash": False,
    "mijoz_ochirish": False,
    "check_royxati": True,
    "check_korish": True,
    "ombor_royxati": False,
    "ombor_qidirish": False,
    "mahsulot_kiritish": False,
    "kassaga_yuborish": False,
    "ombor_tasdiqlash": False,
    "eslatma_qoshish": False,
    "yaqin_sanalar": False,
    "hisobot_korish": True,
    "xodim_boshqarish": False,
},


}






