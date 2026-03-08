// ==UserScript==
// @name         Infobae Phrase Blocking
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Oculta noticias de Infobae que contengan palabras/frases prohibidas (solo palabras completas)
// @match        *://*.infobae.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/GutierrezLuisEduardo/BloquearFrasesDeNoticias/refs/heads/main/vector.j
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Esperamos a que vector.js dispare el evento (tú lo tienes que modificar también)
    window.addEventListener('forbiddenPhrasesLoaded', initBlocker);

    // Si por alguna razón el vector ya estaba cargado antes (poco probable pero posible)
    if (window.forbiddenPhrases && Array.isArray(window.forbiddenPhrases)) {
        initBlocker();
    }

    function initBlocker() {
        if (window.blockerAlreadyInitialized) return; // evitar duplicados
        window.blockerAlreadyInitialized = true;

        console.log(`Bloqueador activado - ${window.forbiddenPhrases.length} frases prohibidas cargadas`);

        // Convertimos cada frase en regex de palabra completa (case insensitive)
        const forbiddenRegexes = window.forbiddenPhrases.map(phrase =>
            new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        );

        // Selectores más robustos y actualizados para Infobae 2025
        const containerSelectors = [
            'article',                                   // lo más seguro
            '[class*="card"]',                           // cualquier card
            '[class*="story"]',                          // story cards
            '[class*="headline"]',                       // titulares
            'a[href*="/"][class*="link"]',              // enlaces con clases raras
            '.nd1', '.nd2', '.nd3',                      // clases comunes en feed
            '[data-testid*="headline"]',                 // por si usan data-testid
        ].join(',');

        function hideIfForbidden(element) {
            // Buscamos el texto del titular en varios lugares posibles
            const possibleHeadlineElements = element.querySelectorAll('h1, h2, h3, h4, [class*="title"], [class*="headline"]');
            let text = '';

            for (const el of possibleHeadlineElements) {
                if (el.textContent.trim()) {
                    text = el.textContent;
                    break;
                }
            }

            // Si no encontramos nada, miramos el texto completo del elemento (último recurso)
            if (!text) text = element.textContent || '';

            if (forbiddenRegexes.some(regex => regex.test(text))) {
                // Ocultamos el contenedor más razonable
                const toHide = element.closest('article') ||
                              element.closest('[class*="card"]') ||
                              element.closest('div') ||
                              element;
                if (toHide) {
                    toHide.style.display = 'none';
                    toHide.style.visibility = 'hidden';
                    toHide.style.height = '0';
                    toHide.style.margin = '0';
                    toHide.style.padding = '0';
                    console.log('Noticia bloqueada:', text.substring(0, 80) + '...');
                }
            }
        }

        function blockNewsArticles() {
            document.querySelectorAll(containerSelectors).forEach(hideIfForbidden);
        }

        // Ejecuciones múltiples porque Infobae carga muy tarde
        blockNewsArticles();
        setTimeout(blockNewsArticles, 1500);
        setTimeout(blockNewsArticles, 4000);
        setTimeout(blockNewsArticles, 8000);

        // Observer permanente
        const observer = new MutationObserver(blockNewsArticles);
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
