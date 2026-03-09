// ==UserScript==
// @name         Infobae Phrase Blocking - v1.5
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Oculta noticias con frases prohibidas (palabras completas + puntuación adyacente)
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

        console.log(`Bloqueador v1.5 activado - ${window.forbiddenPhrases.length} frases cargadas`);

        const punctuation = `"'.,!?¡¿:();-–—…\\s`.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const forbiddenRegexes = window.forbiddenPhrases.map(phrase => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`(?:^|[${punctuation}]+)${escaped}(?:[${punctuation}]+|$)`, 'i');
        });

        const containerSelectors = [
            'article',
            '[class*="card"]', '[class*="Card"]',
            '[class*="story"]', '[class*="Story"]',
            '[class*="feed__"]', '.feed-item', '.nd-feed-item', '.feed-article',
            '.nd-', '.nd1', '.nd2', '.nd3',
            '.article-item', '.card__content', '.card--news', '.story__content',
            '[class*="headline"]', '[class*="title"]', '[class*="titulo"]',
            'a[href*="/"][class*="link"]', '[data-testid*="card"]', '[data-article-id]',
            '.post', '.item-news'
        ].join(',');

        function hideIfForbidden(container) {
            const headlineCandidates = container.querySelectorAll([
                'h1', 'h2', 'h3', 'h4',
                '[class*="title"]', '[class*="headline"]', '[class*="titulo"]',
                '.card__title', '.feed__title', '.nd-headline', '.story__title'
            ].join(','));

            let text = '';
            for (const el of headlineCandidates) {
                const t = el.textContent.trim();
                if (t.length > 15) {
                    text = t;
                    break;
                }
            }
            if (!text) text = container.textContent.trim();
            if (text.length < 20) return; // Evitar bloquear menús o textos cortos

            let matchedPhrase = '';
            const hasForbidden = forbiddenRegexes.some(regex => {
                if (regex.test(text)) {
                    matchedPhrase = regex.source;
                    return true;
                }
                return false;
            });

            if (hasForbidden) {
                let toHide = container.closest('article') ||
                             container.closest('[class*="card"]') ||
                             container.closest('[class*="story"]') ||
                             container.closest('[class*="feed"]') ||
                             container.closest('div') ||
                             container;

                if (toHide && toHide.style.display !== 'none') {
                    toHide.style.cssText = 'display: none !important; visibility: hidden !important; height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important;';
                    console.log(`Bloqueada (regex: ${matchedPhrase}): "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
                }
            }
        }

        function scanAndBlock() {
            document.querySelectorAll(containerSelectors).forEach(hideIfForbidden);
        }

        scanAndBlock();
        [1200, 3500, 7000, 12000, 20000].forEach(t => setTimeout(scanAndBlock, t));

        const observer = new MutationObserver(mutations => {
            if (mutations.some(m => m.addedNodes.length)) scanAndBlock();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
