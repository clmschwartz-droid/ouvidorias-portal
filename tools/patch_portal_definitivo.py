from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')


def one_replace(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


menu_marker = '''            <button onclick="navigate('inscreva-se')" class="nav-link text-left px-4 py-3 rounded-lg transition flex items-center gap-3 shrink-0 text-white font-medium" style="background-color:#4B9DAB;" data-target="inscreva-se">
                <i data-lucide="mail-plus" class="w-5 h-5"></i> <span class="hidden md:inline">Inscreva-se</span>
            </button>'''
menu_add = menu_marker + '''
            <button onclick="navigate('fala-ouvidor')" class="nav-link text-left px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-3 shrink-0" data-target="fala-ouvidor">
                <i data-lucide="message-circle-more" class="w-5 h-5"></i> <span class="hidden md:inline">Fala Ouvidor</span>
            </button>'''
s = one_replace(s, menu_marker, menu_add, 'menu Fala Ouvidor')

news_start = s.index('<section id="noticias"')
news_end = s.index('</section>', news_start)
news = s[news_start:news_end]
news = one_replace(news, '''            <div class="space-y-6">
                <!-- CONTEÚDO EDITÁVEL: cada notícia é um card como o abaixo -->''', '''            <div class="space-y-6">
                <div id="noticias-dinamicas" class="space-y-6"></div>
                <!-- CONTEÚDO EDITÁVEL LEGADO: mantido como fallback até o conteúdo correspondente ser publicado pelo CMS -->''', 'container notícias dinâmicas')
news = one_replace(news, '<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">', '<div data-legacy-id="maceio-2026" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">', 'card legado Maceió')
news = one_replace(news, '<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">', '<div data-legacy-id="maceio-2026" class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">', 'download legado Maceió')
s = s[:news_start] + news + s[news_end:]

docs_start = s.index('<section id="documentos"')
docs_end = s.index('</section>', docs_start)
docs = s[docs_start:docs_end]
intro = '''            <p class="text-slate-500 mb-8 pb-4 border-b">O pioneirismo da Ouvidoria Municipal de Curitiba e outros registros históricos e atuais sobre o instituto do ombudsman no Brasil e no mundo.</p>'''
recent = intro + '''

            <div id="documentos-recentes-section" class="hidden mb-8">
                <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Documentos recentes</h3>
                <div id="documentos-recentes-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
            </div>'''
docs = one_replace(docs, intro, recent, 'Documentos recentes')
intl_grid = '''            <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Declarações e documentos internacionais</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'''
intl_add = intl_grid + '''
                <div id="documentos-internacionais-dinamicos" class="contents"></div>'''
docs = one_replace(docs, intl_grid, intl_add, 'Documentos internacionais dinâmicos')
s = s[:docs_start] + docs + s[docs_end:]

mm_start = s.index('<section id="multimidia"')
mm_end = s.index('</section>', mm_start)
mm = s[mm_start:mm_end]
mm = one_replace(mm,
'''            <div class="mb-6 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700"><i data-lucide="hammer" class="w-3.5 h-3.5"></i> Seção em construção</div>''',
'''            <div id="multimidia-em-construcao" class="mb-6 inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700"><i data-lucide="hammer" class="w-3.5 h-3.5"></i> Seção em construção</div>''', 'badge multimídia')
mm = one_replace(mm,
'''            <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="multimidia-grid">
                <!-- Card simulado de vídeo: substituir pelo iframe real quando houver conteúdo -->''',
'''            <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="multimidia-grid">
                <div id="multimidia-dinamica" class="contents"></div>
                <!-- Cards simulados: ficam como fallback somente enquanto não houver conteúdo real -->''', 'host multimídia')
card_open = '<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">'
if mm.count(card_open) != 2:
    raise SystemExit(f'multimídia placeholders: esperado 2 cards, encontrado {mm.count(card_open)}')
mm = mm.replace(card_open, '<div class="multimidia-placeholder bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">')
s = s[:mm_start] + mm + s[mm_end:]

fala_section = '''

        <!-- ================= SEÇÃO: FALA OUVIDOR ================= -->
        <section id="fala-ouvidor" class="section-content hidden p-6 md:p-10 max-w-2xl mx-auto fade-in">
            <div class="rounded-2xl p-8 md:p-10 text-white shadow-lg mb-8" style="background-color:#1c2b2e;">
                <h2 class="text-3xl font-bold mb-3">Fala Ouvidor</h2>
                <p class="leading-relaxed" style="color:#bcdadf;">Canal direto para sugestões, correções, envio de referências e outras mensagens sobre o Portal das Ouvidorias Públicas do Brasil.</p>
            </div>

            <form id="fala-ouvidor-form" class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-5" onsubmit="event.preventDefault();">
                <div class="grid md:grid-cols-2 gap-4">
                    <label class="block text-sm font-semibold text-slate-700">Nome
                        <input type="text" name="nome" autocomplete="name" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-teal-200" placeholder="Seu nome">
                    </label>
                    <label class="block text-sm font-semibold text-slate-700">E-mail
                        <input type="email" name="email" autocomplete="email" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-teal-200" placeholder="voce@exemplo.com">
                    </label>
                </div>
                <label class="block text-sm font-semibold text-slate-700">Assunto
                    <select name="assunto" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal bg-white focus:outline-none focus:ring-2 focus:ring-teal-200">
                        <option>Sugestão</option>
                        <option>Correção ou atualização</option>
                        <option>Envio de documento ou referência</option>
                        <option>Outro assunto</option>
                    </select>
                </label>
                <label class="block text-sm font-semibold text-slate-700">Mensagem
                    <textarea name="mensagem" rows="7" class="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:outline-none focus:ring-2 focus:ring-teal-200" placeholder="Escreva sua mensagem"></textarea>
                </label>
                <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                    A estrutura do formulário já está pronta. O envio será ativado antes da publicação, depois de definirmos o endereço institucional que receberá as mensagens.
                </div>
                <button type="submit" disabled class="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-white font-semibold opacity-50 cursor-not-allowed" style="background-color:#4B9DAB;">
                    <i data-lucide="send" class="w-4 h-4"></i> Envio em configuração
                </button>
            </form>
        </section>'''
quem_marker = '''

        <!-- ================= SEÇÃO: QUEM SOMOS ================= -->'''
s = one_replace(s, quem_marker, fala_section + quem_marker, 'seção Fala Ouvidor')

if 'portal-content.js' in s:
    raise SystemExit('portal-content.js já estava referenciado antes da aplicação do patch')
s = one_replace(s, '</body>', '    <script src="portal-content.js"></script>\n</body>', 'script portal-content')

p.write_text(s, encoding='utf-8')
print('Estrutura aplicada com sucesso.')
