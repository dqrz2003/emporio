/* Emporio Gourmet · leitura pública do cardápio no Firebase (Firestore via REST).
   Usado pelo cartão de visitas, pelo cardápio da mesa e pelo delivery.
   Se este arquivo não carregar, cada página continua funcionando com seus dados internos. */
(function () {
  var BASE = 'https://firestore.googleapis.com/v1/projects/empoprio/databases/(default)/documents/';
  var CACHE = 'emporio-publico', FOTO = 'emporio-foto-';

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Busca o cardápio publicado. Em caso de falha usa a última cópia guardada neste aparelho.
  function carregar() {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 3500);
    return fetch(BASE + 'cardapio/publico', { signal: ctrl.signal })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var txt = j.fields.json.stringValue;
        try { localStorage.setItem(CACHE, txt); } catch (e) { /* sem espaço */ }
        return JSON.parse(txt);
      })
      .catch(function () {
        clearTimeout(t);
        try { var c = localStorage.getItem(CACHE); if (c) return JSON.parse(c); } catch (e) { /* ignora */ }
        return null;
      });
  }

  // Converte os pratos publicados para o formato usado pelas páginas.
  function paraPratos(d) {
    return (d.pratos || []).map(function (p) {
      return { id: p.id, cat: p.categoria, nome: esc(p.nome), desc: esc(p.descricao), preco: Number(p.preco) || 0, img: p.foto || '', destaque: !!p.destaque };
    });
  }

  // Fotos enviadas pelo painel ficam em documentos próprios ("foto:ID"); o ID muda a cada foto nova, então o cache nunca fica velho.
  function srcFoto(ref) {
    var id = ref.slice(5), c = null;
    try { c = localStorage.getItem(FOTO + id); } catch (e) { /* ignora */ }
    if (c) return Promise.resolve(c);
    return fetch(BASE + 'fotos/' + encodeURIComponent(id))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        var u = j.fields.d.stringValue;
        try { localStorage.setItem(FOTO + id, u); } catch (e) { /* ignora */ }
        return u;
      });
  }

  function resolverImagens(raiz) {
    (raiz || document).querySelectorAll('img[data-foto]').forEach(function (img) {
      srcFoto(img.getAttribute('data-foto')).then(function (u) { img.src = u; }).catch(function () { img.remove(); });
    });
  }

  window.CardapioNuvem = { carregar: carregar, paraPratos: paraPratos, resolverImagens: resolverImagens };
})();
