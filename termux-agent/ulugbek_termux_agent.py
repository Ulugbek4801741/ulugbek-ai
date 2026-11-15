#!/usr/bin/env python3
"""ULUGBEK Termux Agent: public-source research + local memory + safe tool routing."""
from __future__ import annotations
import ast, json, operator, os, re, sys, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

APP_DIR = Path.home() / ".ulugbek_agent"
MEMORY_FILE = APP_DIR / "knowledge.json"
USER_AGENT = "ULUGBEK-Termux-Agent/1.0 (read-only public research)"
MAX_MEMORY_ITEMS, MAX_EXCERPT, TIMEOUT = 500, 2600, 12

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def http_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        if response.status != 200:
            raise RuntimeError("Internet manbasi HTTP " + str(response.status))
        return json.loads(response.read(2_000_000).decode("utf-8"))

def load_memory():
    try:
        data = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except FileNotFoundError:
        return []
    except (OSError, json.JSONDecodeError):
        print("Ogohlantirish: mahalliy xotira o‘qilmadi; yangi xotira yaratiladi.")
        return []

def save_memory(items):
    APP_DIR.mkdir(parents=True, exist_ok=True)
    temp = MEMORY_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(items[-MAX_MEMORY_ITEMS:], ensure_ascii=False, indent=2), encoding="utf-8")
    os.chmod(temp, 0o600)
    temp.replace(MEMORY_FILE)

def tokens(text):
    return {w.lower() for w in re.findall(r"[^\W_]{3,}", text, flags=re.UNICODE)
            if w.lower() not in {"uchun", "bilan", "haqida", "qanday", "nima", "the", "and"}}

def search_local_memory(query, memory):
    query_terms = tokens(query)
    ranked = []
    for item in memory:
        text = str(item.get("title", "")) + " " + str(item.get("excerpt", ""))
        overlap = len(query_terms & tokens(text))
        if overlap:
            ranked.append((overlap, item))
    ranked.sort(key=lambda row: row[0], reverse=True)
    return [item for _, item in ranked[:3]]

def wikipedia_research(query):
    """O‘zbek Wikipedia birinchi, natija bo‘lmasa ingliz Wikipedia."""
    for language in ("uz", "en"):
        base = "https://" + language + ".wikipedia.org/w/api.php?"
        params = urllib.parse.urlencode({
            "action": "query", "list": "search", "srsearch": query,
            "format": "json", "utf8": "1", "srlimit": "4"
        })
        search_data = http_json(base + params)
        hits = search_data.get("query", {}).get("search", [])
        found = []
        for hit in hits[:4]:
            page_id = hit.get("pageid")
            if not page_id:
                continue
            detail_params = urllib.parse.urlencode({
                "action": "query", "pageids": str(page_id), "prop": "extracts",
                "explaintext": "1", "exintro": "1", "exchars": str(MAX_EXCERPT),
                "format": "json", "utf8": "1"
            })
            detail = http_json(base + detail_params)
            page = detail.get("query", {}).get("pages", {}).get(str(page_id), {})
            excerpt = re.sub(r"\s+", " ", str(page.get("extract", ""))).strip()
            if len(excerpt) < 100:
                continue
            found.append({
                "title": str(page.get("title") or hit.get("title") or "Wikipedia"),
                "language": language,
                "url": "https://" + language + ".wikipedia.org/?curid=" + str(page_id),
                "excerpt": excerpt[:MAX_EXCERPT],
                "saved_at": now_iso()
            })
        if found:
            return found
    return []

_ALLOWED_BINOPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod, ast.Pow: operator.pow
}
_ALLOWED_UNARY = {ast.UAdd: operator.pos, ast.USub: operator.neg}

def safe_calculate(expression):
    tree = ast.parse(expression, mode="eval")
    def visit(node):
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 8:
                raise ValueError("Daraja 8 dan katta bo‘lmasin.")
            if isinstance(node.op, (ast.Div, ast.FloorDiv, ast.Mod)) and right == 0:
                raise ZeroDivisionError("Nolga bo‘lish mumkin emas.")
            result = _ALLOWED_BINOPS[type(node.op)](left, right)
            if abs(result) > 10**15:
                raise ValueError("Natija xavfsizlik chegarasidan oshdi.")
            return result
        if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARY:
            return _ALLOWED_UNARY[type(node.op)](visit(node.operand))
        raise ValueError("Faqat sonlar va + - * / // % ** amallariga ruxsat.")
    return visit(tree)

class UlugbekAgent:
    def __init__(self):
        self.memory = load_memory()
        self.tools = {
            "internet_research": self.research,
            "local_memory": self.recall,
            "calculator": self.calculate
        }

    def calculate(self, task):
        expression = task.replace("×", "*").replace("÷", "/").strip()
        try:
            return "Natija: " + str(safe_calculate(expression))
        except ZeroDivisionError:
            return "Nolga bo‘lish mumkin emas. Natija aniqlanmaydi."
        except Exception as error:
            return "Hisoblash bajarilmadi: " + str(error)

    def research(self, task):
        print("Ochiq internet manbasi qidirilmoqda...")
        try:
            results = wikipedia_research(task)
        except Exception as error:
            return "Internet qidiruvi ishlamadi: " + str(error) + "\nInternetni tekshirib, qayta urinib ko‘ring."
        if not results:
            return "O‘zbek va ingliz Wikipedia manbalarida mos sahifa topilmadi. Bu ma’lumot yo‘q degani emas."
        known_urls = {item.get("url") for item in self.memory}
        added = 0
        for item in results:
            if item["url"] not in known_urls:
                self.memory.append(item)
                added += 1
        save_memory(self.memory)
        lines = ["Topilgan ochiq manbalar (" + str(len(results)) + "):"]
        for index, item in enumerate(results, 1):
            lines.append("\n" + str(index) + ". " + item["title"] + " [" + item["language"] + "]\n" +
                         item["excerpt"][:1000] + "\nManba: " + item["url"])
        lines.append("\nMahalliy xotiraga yangi saqlangan sahifalar: " + str(added))
        lines.append("Eslatma: bu ma’lumotni qidirish va saqlash; AI modelini qayta o‘qitish emas.")
        return "\n".join(lines)

    def recall(self, task):
        matches = search_local_memory(task, self.memory)
        if not matches:
            return "Mahalliy xotirada mos ma’lumot yo‘q. Internetdan izlash uchun savolni qayta yozing."
        return "\n\n".join(item["title"] + "\n" + item["excerpt"][:900] + "\nManba: " + item["url"]
                           for item in matches)

    def choose_tool(self, task):
        value = task.lower()
        if re.fullmatch(r"[\d\s.+*/()%\-×÷]+", value) and re.search(r"[+*/()%\-×÷]", value):
            return "calculator"
        if any(word in value for word in ("xotiramda", "eslab qolgan", "oldin o‘rgangan", "oldin urgangan")):
            return "local_memory"
        return "internet_research"

    def run(self, task):
        tool_name = self.choose_tool(task)
        print("Reja: so‘rovni tahlil qilish → " + tool_name + " vositasini tanlash → natijani tekshirish.")
        return self.tools[tool_name](task)

def self_test():
    assert safe_calculate("569 - 568") == 1
    assert safe_calculate("12 * (3 + 2)") == 60
    try:
        safe_calculate("1 / 0")
    except ZeroDivisionError:
        pass
    else:
        raise AssertionError("Nolga bo‘lish bloklanmadi")
    assert UlugbekAgent().choose_tool("2 + 3") == "calculator"
    assert UlugbekAgent().choose_tool("Amir Temur tarixi") == "internet_research"
    print("SELF-TEST: 5 ta tekshiruv muvaffaqiyatli.")

def main():
    if "--self-test" in sys.argv:
        self_test()
        return
    agent = UlugbekAgent()
    print("ULUGBEK AI — Termux agenti")
    print("Ochiq manbalardan ma’lumot izlaydi va natijalarni telefon xotirasiga saqlaydi.")
    print("Buyruqlar: /help — yordam, /memory — xotira, /exit — chiqish.")
    print("Xavfsizlik: ixtiyoriy shell buyruqlarini bajarmaydi va o‘z kodini o‘zgartirmaydi.")
    while True:
        try:
            task = input("\nSiz > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAgent to‘xtatildi.")
            break
        if not task:
            continue
        if task.lower() in ("/exit", "exit", "quit"):
            print("Agent yakunlandi.")
            break
        if task.lower() == "/help":
            print("Savol yoki mavzu yozing — agent internetdan izlaydi. Misol: Amir Temur haqida ma’lumot.")
            print("Hisoblash: 569-568÷(0). /memory — saqlangan bilimlar soni.")
            continue
        if task.lower() == "/memory":
            print("Mahalliy xotiradagi sahifalar:", len(agent.memory))
            print("Xotira fayli:", MEMORY_FILE)
            continue
        print("\nULUGBEK Agent > " + agent.run(task))

if __name__ == "__main__":
    main()
