// ==UserScript==
// @name         Infobae Phrase Blocking - Mejorado
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Oculta noticias de Infobae que contengan palabras/frases prohibidas (detecta incluso pegadas a puntuación)
// @match        *://*.infobae.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/GutierrezLuisEduardo/BloquearFrasesDeNoticias/refs/heads/main/vector.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Espera a que vector.js cargue las frases
    window.addEventListener('forbiddenPhrasesLoaded', initBlocker);

    // Por si ya están cargadas antes (raro, pero por si acaso)
    if (window.forbiddenPhrases && Array.isArray(window.forbiddenPhrases)) {
        initBlocker();
    }

    function initBlocker() {
        if (window.blockerAlreadyInitialized) return;
        window.blockerAlreadyInitialized = true;

        console.log(`Bloqueador activado - ${window.forbiddenPhrases.length} frases prohibidas cargadas`);

        // Caracteres que permitimos antes y después de la frase (sin necesidad de espacio)
        const punctuation = `["'¡¿:(),.!?¿¡\\-–—:;]`;

        // Creamos regex que detecta la frase aunque esté pegada a puntuación
        const forbiddenRegexes = window.forbiddenPhrases.map(phrase => {
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Detecta la frase completa, permitiendo puntuación o espacios alrededor
            return new RegExp(
                `(?:^|[\\s${punctuation}]+)${escaped}(?:[\\s${punctuation}]+|$)`,
                'i'
            );
        });

        // Selectores para encontrar posibles contenedores de noticias / titulares
        const containerSelectors = [
            'article',
            '[class*="card"]',
            '[class*="story"]',
            '[class*="item"]',
            '[class*="post"]',
            '[class*="headline"]',
            'a[href*="/"][class*="link"]',
            '.nd1, .nd2, .nd3, .nd4',
            '[data-testid*="headline"]',
            '[data-article-id]',
            'div[class*="teaser"]',
            'div[class*="noticia"]'
        ].join(',');

        function getHeadlineText(element) {
            // Intentamos obtener el texto más probable del titular
            const selectors = [
                'h1', 'h2', 'h3', 'h4',
                '[class*="title"]', '[class*="headline"]',
                '[class*="titulo"]', '[class*="h1"]', '[class*="h2"]',
                'a', 'span[class*="title"]'
            ];

            for (const sel of selectors) {
                const found = element.querySelector(sel);
                if (found && found.textContent.trim()) {
                    return found.textContent.trim();
                }
            }

            // Último recurso: todo el texto del contenedor
            return element.textContent.trim() || '';
        }

        function hideIfForbidden(container) {
            const text = getHeadlineText(container);
            if (!text) return;

            if (forbiddenRegexes.some(regex => regex.test(text))) {
                // Ocultamos el contenedor más razonable
                const toHide = container.closest('article') ||
                              container.closest('[class*="card"]') ||
                              container.closest('div') ||
                              container;

                if (toHide && toHide.style.display !== 'none') {
                    toHide.style.display = 'none';
                    toHide.style.visibility = 'hidden';
                    toHide.style.height = '0';
                    toHide.style.margin = '0';
                    toHide.style.padding = '0';
                    toHide.style.overflow = 'hidden';

                    console.log('Noticia bloqueada:', text.substring(0, 90) + (text.length > 90 ? '...' : ''));
                }
            }
        }

        function scanAndBlock() {
            document.querySelectorAll(containerSelectors).forEach(hideIfForbidden);
        }

        // Ejecutamos varias veces porque Infobae carga contenido dinámico
        scanAndBlock();
        setTimeout(scanAndBlock, 1200);
        setTimeout(scanAndBlock, 3000);
        setTimeout(scanAndBlock, 6000);
        setTimeout(scanAndBlock, 10000);

        // Observer para contenido que se carga después (scroll infinito, lazy load, etc.)
        const observer = new MutationObserver(() => {
            scanAndBlock();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
