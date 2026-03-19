// ==UserScript==
// @name         Infobae Phrase Blocking - Mejorado
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Oculta noticias de Infobae que contengan frases prohibidas (palabras completas + puntuación adyacente)
// @match        *://*.infobae.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/GutierrezLuisEduardo/BloquearFrasesDeNoticias/refs/heads/main/vector.j
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    window.addEventListener('forbiddenPhrasesLoaded', initBlocker);

    if (window.forbiddenPhrases && Array.isArray(window.forbiddenPhrases)) {
        initBlocker();
    }

    function initBlocker() {
        if (window.blockerAlreadyInitialized) return;
        window.blockerAlreadyInitialized = true;

        console.log(`Bloqueador activado - ${window.forbiddenPhrases.length} frases prohibidas`);

        // Nueva regex con puntuación opcional alrededor
        const punctuation = '[\\s\\p{P}\\p{S}]*';
        const forbiddenRegexes = window.forbiddenPhrases.map(phrase =>
            new RegExp(`(^|${punctuation})(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(${punctuation}|$)`, 'iu')
        );

        // Selectores (mantengo los tuyos, son bastante buenos para Infobae)
        const containerSelectors = [
            'article',
            '[class*="card"]',
            '[class*="story"]',
            '[class*="headline"]',
            'a[href*="/"][class*="link"]',
            '.nd1, .nd2, .nd3',
            '[data-testid*="headline"]',
            '.feed-item',           // a veces usan esto
            '[class*="item-news"]'  // por si agregan nuevas clases
        ].join(',');

        function hideIfForbidden(element) {
            const possibleHeadlineElements = element.querySelectorAll(
                'h1, h2, h3, h4, h5, [class*="title"], [class*="headline"], [class*="text"], a'
            );

            let text = '';
            for (const el of possibleHeadlineElements) {
                const txt = el.textContent?.trim();
                if (txt) {
                    text = txt;
                    break;
                }
            }

            if (!text) text = element.textContent?.trim() || '';

            if (forbiddenRegexes.some(regex => regex.test(text))) {
                const toHide = element.closest('article') ||
                               element.closest('[class*="card"]') ||
                               element.closest('[class*="story"]') ||
                               element.closest('div') ||
                               element;

                if (toHide && toHide.style.display !== 'none') {
                    toHide.style.display = 'none';
                    toHide.style.visibility = 'hidden';
                    toHide.style.height = '0';
                    toHide.style.margin = '0';
                    toHide.style.padding = '0';
                    toHide.style.overflow = 'hidden';
                    console.log('Bloqueada →', text.substring(0, 90) + (text.length > 90 ? '...' : ''));
                }
            }
        }

        function blockNewsArticles() {
            document.querySelectorAll(containerSelectors).forEach(hideIfForbidden);
        }

        // Múltiples ejecuciones por lazy-loading de Infobae
        blockNewsArticles();
        setTimeout(blockNewsArticles, 1000);
        setTimeout(blockNewsArticles, 3000);
        setTimeout(blockNewsArticles, 6000);
        setTimeout(blockNewsArticles, 10000);

        // Observer para contenido dinámico
        const observer = new MutationObserver((mutations) => {
            if (mutations.some(m => m.addedNodes.length > 0)) {
                blockNewsArticles();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
