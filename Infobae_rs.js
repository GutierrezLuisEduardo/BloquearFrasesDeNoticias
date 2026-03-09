// ==UserScript==
// @name         Infobae Phrase Blocking - Mejorado
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Oculta noticias de Infobae que contengan frases prohibidas (palabras completas + puntuación adyacente permitida)
// @match        *://*.infobae.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/GutierrezLuisEduardo/BloquearFrasesDeNoticias/refs/heads/main/vector.js
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

        console.log(`Bloqueador activado - ${window.forbiddenPhrases.length} frases prohibidas cargadas`);

        // Caracteres de puntuación/separación que permitimos pegados a la frase
        const punctuation = `"'.,!?¡¿:();-–—…`.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // escapamos para regex

        // Regex base: permite 0 o más puntuaciones antes y después, pero no letras/números pegados
        const forbiddenRegexes = window.forbiddenPhrases.map(phrase => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // \b o puntuación al inicio, lo mismo al final
            return new RegExp(`(?:^|[${punctuation}\\s])${escaped}(?:[${punctuation}\\s]|$)`, 'i');
        });

        // Selectores más actualizados y amplios para Infobae 2025-2026
        const containerSelectors = [
            'article',
            '[class*="card"]',
            '[class*="story"]',
            '[class*="feed__item"]',
            '[class*="nd-"]',           // muy común: nd1, nd-feed, etc.
            '.article-item',
            '.card__content',
            '.story-card',
            '[class*="headline"]',
            '[class*="title"]',
            'a[href*="/"][class*="link"]',
            '[data-testid*="card"]',
            '[data-article-id]'         // a veces usan data attributes
        ].join(',');

        function hideIfForbidden(container) {
            // Buscamos texto en elementos probables de titular
            const headlineCandidates = container.querySelectorAll([
                'h1', 'h2', 'h3', 'h4',
                '[class*="title"]',
                '[class*="headline"]',
                '[class*="titulo"]',
                '.card__title',
                '.feed__title',
                '.nd-headline'
            ].join(','));

            let text = '';

            // Tomamos el primer elemento con texto significativo
            for (const el of headlineCandidates) {
                const t = el.textContent.trim();
                if (t.length > 10) {   // evitamos breadcrumbs o textos muy cortos
                    text = t;
                    break;
                }
            }

            // Fallback: todo el texto del contenedor (menos preciso pero útil)
            if (!text) {
                text = container.textContent.trim();
            }

            if (!text) return;

            const hasForbidden = forbiddenRegexes.some(regex => regex.test(text));

            if (hasForbidden) {
                // Ocultamos el contenedor más específico posible
                let toHide = container.closest('article') ||
                             container.closest('[class*="card"]') ||
                             container.closest('[class*="story"]') ||
                             container.closest('[class*="feed"]') ||
                             container.closest('div') ||
                             container;

                if (toHide && toHide.style.display !== 'none') {
                    toHide.style.display = 'none';
                    toHide.style.visibility = 'hidden';
                    toHide.style.height = '0';
                    toHide.style.margin = '0';
                    toHide.style.padding = '0';
                    toHide.style.overflow = 'hidden';

                    console.log('Noticia bloqueada:', text.substring(0, 70) + (text.length > 70 ? '...' : ''));
                }
            }
        }

        function scanAndBlock() {
            document.querySelectorAll(containerSelectors).forEach(hideIfForbidden);
        }

        // Ejecutamos varias veces por lazy loading de Infobae
        scanAndBlock();
        setTimeout(scanAndBlock, 1200);
        setTimeout(scanAndBlock, 3500);
        setTimeout(scanAndBlock, 7000);
        setTimeout(scanAndBlock, 12000);

        // Observer para contenido dinámico (scroll infinito, etc.)
        const observer = new MutationObserver((mutations) => {
            if (mutations.some(m => m.addedNodes.length > 0)) {
                scanAndBlock();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
