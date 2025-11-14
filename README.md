# Testovací systém

Jednoduchá webová aplikace pro vytváření a vyplňování testů. **Načítá testy přímo z Word dokumentů!**

## Jak nahrát na GitHub Pages (ZDARMA)

1. Vytvořte účet na [GitHub.com](https://github.com)
2. Vytvořte nový repozitář (Public)
3. Nahrajte všechny soubory
4. Vytvořte prázdnou složku `tests` (vytvořte soubor `tests/.gitkeep`)
5. Jděte do Settings → Pages → Source: vyberte "main" branch → Save
6. Vytvořte Personal Access Token:
   - V aplikaci klikněte na link "Klikněte zde pro vytvoření tokenu"
   - Nebo jděte na: https://github.com/settings/tokens/new
   - Zaškrtněte "repo"
   - Klikněte "Generate token"
   - **Zkopírujte token** (zobrazí se jen jednou!)
7. V aplikaci vyplňte:
   - Repository: `username/repository` (např. `jan/testovaci-system`)
   - Token: vložte zkopírovaný token
   - Klikněte "Uložit nastavení"
8. Hotovo! Testy se budou nahrávat automaticky

## Jak používat

### Učitel:
1. Otevřete aplikaci → "Prostředí učitele"
2. **Vyplňte GitHub nastavení** (jednou) - repository a token
3. **Nahrajte Word dokument (.docx)** - automaticky se převede na test
4. Zkontrolujte vygenerované otázky
5. Nastavte bodování pro známky
6. Klikněte "Vytvořit test"
7. **Test se automaticky nahraje na GitHub!**
8. Zkopírujte krátký link a pošlete studentům

### Student:
1. Otevře link od učitele
2. Vyplní jméno, příjmení, třídu
3. Odpovídá na otázky (každou zvlášť)
4. Odešle test a vidí výsledky
5. **Výsledky se automaticky odešlou učiteli na GitHub!**
6. Může zavřít stránku

### Výsledky:
1. Učitel → "Výsledky testů"
2. Vybere test
3. Klikne "🔄 Obnovit" → načtou se nové výsledky z GitHubu
4. Vidí všechny výsledky
5. Může exportovat do CSV

## Formát Word dokumentu

```
Název testu: Matematika - Test 1

1. Kolik je 2 + 2?
A) 3
B) 4
C) 5
D) 6
Správně: B

2. Další otázka?
A) Odpověď A
B) Odpověď B
C) Odpověď C
D) Odpověď D
Správně: A
```

**Pravidla:**
- První řádek: Název testu
- Otázky začínají číslem a tečkou (1., 2., 3., ...)
- Odpovědi: A), B), C), D)
- Správná odpověď: "Správně: A" (nebo B, C, D)

## Důležité

- Krátké linky pro studenty (např. `?test=test_123`)
- Výsledky se posílají zpět přes link
- Učitel používá vždy stejný prohlížeč
- Pravidelně exportujte výsledky do CSV
- Word dokument musí být .docx (ne .doc)
