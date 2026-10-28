// _ai-generated-header_ [last-model-used: claude-sonnet-4-5, timestamp-created: 2026-06-01T06:56:21Z, timestamp-lastupdated: 2026-06-03T09:21:39Z, generated-by: cursor]

/**
 * debug-overlay.js
 *
 * Visual debugging overlay with three components:
 *
 *   1. Focus ring    — pink outlined box that tracks whichever element has focus.
 *   2. Click marker  — pink crosshair + dot at exact (clientX, clientY). Stays
 *                      visible until the next click (no fade-out).
 *   3. Event log bar — appended at the end of <body> in normal document flow.
 *                      Never floats, never overlaps existing content. The page
 *                      simply gets a natural scrollbar to reach it.
 *                      Consecutive identical events are merged with a ×N badge.
 *                      Events: focus, blur, click, mousedown, mouseup, dblclick,
 *                      contextmenu, keydown, keyup, keypress, scroll.
 *
 * Include on a page:
 *   <script src="../common/debug-overlay.js"></script>   (file:// or dev server)
 */
(function () {
    'use strict';

    // Idempotency guard
    if (document.getElementById('__debug_overlay_loaded__')) return;
    var _guard = document.createElement('meta');
    _guard.id = '__debug_overlay_loaded__';
    (document.head || document.documentElement).appendChild(_guard);

    var BASE_Z = '2147483647';

    function el(tag, styles, attrs) {
        var node = document.createElement(tag);
        if (styles) Object.assign(node.style, styles);
        if (attrs) Object.assign(node, attrs);
        return node;
    }

    function describeElement(target) {
        if (!target || target === document || target === window) return '(document)';
        if (target === document.body) return 'body';
        var tag = (target.tagName || '?').toLowerCase();
        if (target.id) return tag + '#' + target.id;
        if (target.className && typeof target.className === 'string') {
            var cls = target.className.trim().split(/\s+/).slice(0, 2).join('.');
            if (cls) return tag + '.' + cls;
        }
        if (target.name) return tag + '[name=' + target.name + ']';
        return tag;
    }

    function nowStr() {
        var d = new Date();
        var p2 = function (n) { return String(n).padStart(2, '0'); };
        return p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    }

    // =========================================================================
    // 1. Focus ring
    // =========================================================================

    // position: absolute + page coordinates so the ring stays anchored to the focused
    // element even when the page (or a parent container) scrolls after focus.
    // No CSS transition — instant update eliminates visible lag during scroll.
    var focusRing = el('div', {
        position: 'absolute', pointerEvents: 'none', zIndex: BASE_Z,
        border: '3px solid #ff69b4',
        backgroundColor: 'rgba(255,105,180,0.12)',
        borderRadius: '4px',
        outline: '1px dashed rgba(255,105,180,0.6)',
        outlineOffset: '2px',
        display: 'none', boxSizing: 'border-box',
    });
    var focusRingLabel = el('div', {
        position: 'absolute', bottom: '100%', left: '0', marginBottom: '3px',
        backgroundColor: 'rgba(255,105,180,0.9)', color: '#fff',
        fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold',
        padding: '1px 5px', borderRadius: '3px', whiteSpace: 'nowrap', lineHeight: '1.5',
    });
    focusRing.appendChild(focusRingLabel);
    document.documentElement.appendChild(focusRing);

    var _focusTarget = null;

    function positionFocusRing(target) {
        if (!target || target === document.body || target === document.documentElement ||
            target === document || target === window) {
            focusRing.style.display = 'none'; return;
        }
        var rect = target.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) { focusRing.style.display = 'none'; return; }
        // Convert viewport -> document (page) coordinates
        Object.assign(focusRing.style, {
            display: 'block',
            top:    (rect.top  + window.scrollY) + 'px',
            left:   (rect.left + window.scrollX) + 'px',
            width:  rect.width  + 'px',
            height: rect.height + 'px',
        });
        focusRingLabel.textContent = describeElement(target);
    }

    document.addEventListener('focus', function (e) {
        _focusTarget = e.target;
        positionFocusRing(e.target);
    }, true);
    document.addEventListener('blur', function () {
        setTimeout(function () {
            _focusTarget = document.activeElement;
            positionFocusRing(document.activeElement);
        }, 50);
    }, true);
    // Re-position on scroll (captures parent container scrolls too via capture=true)
    window.addEventListener('scroll', function () { positionFocusRing(_focusTarget); }, true);
    window.addEventListener('resize', function () { positionFocusRing(_focusTarget); });

    // =========================================================================
    // 2. Click marker (stays until next click)
    // =========================================================================

    function crosshairArm(horiz) {
        return el('div', {
            position: 'absolute', backgroundColor: '#ff1493', opacity: '0.8',
            pointerEvents: 'none',
            width: horiz ? '12px' : '1px', height: horiz ? '1px' : '12px',
            top: horiz ? '50%' : '0', left: horiz ? '0' : '50%',
            transform: horiz ? 'translateY(-50%)' : 'translateX(-50%)',
        });
    }
    // position: absolute + pageX/pageY so the marker stays anchored to the clicked
    // point in the document even when the page scrolls after the click.
    var clickMarker = el('div', {
        position: 'absolute', pointerEvents: 'none', zIndex: BASE_Z,
        width: '12px', height: '12px', transform: 'translate(-50%,-50%)', display: 'none',
    });
    // large outer ring — visually locates the click without covering content
    clickMarker.appendChild(el('div', {
        position: 'absolute',
        top: '-14px', left: '-14px',
        width: '40px', height: '40px',
        borderRadius: '50%',
        border: '2px solid #ff1493',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
    }));
    clickMarker.appendChild(crosshairArm(true));
    clickMarker.appendChild(crosshairArm(false));
    clickMarker.appendChild(el('div', {
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '4px', height: '4px', borderRadius: '50%',
        backgroundColor: '#ff1493', boxShadow: '0 0 0 1px #fff',
    }));
    var clickCoordLabel = el('div', {
        position: 'absolute', pointerEvents: 'none', zIndex: BASE_Z,
        backgroundColor: 'rgba(180,0,90,0.9)', color: '#fff',
        fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold',
        padding: '2px 7px', borderRadius: '3px', whiteSpace: 'nowrap',
        display: 'none', lineHeight: '1.6',
    });
    document.documentElement.appendChild(clickMarker);
    document.documentElement.appendChild(clickCoordLabel);

    document.addEventListener('click', function (e) {
        // pageX/Y = document coords — marker stays on the clicked element even after scroll
        var px = Math.round(e.pageX), py = Math.round(e.pageY);
        // clientX/Y = viewport coords — shown in the label for reference
        var cx = Math.round(e.clientX), cy = Math.round(e.clientY);

        Object.assign(clickMarker.style, { display: 'block', left: px + 'px', top: py + 'px' });

        // Keep label near the dot, flipping sides near viewport edges
        var lx = px + 14, ly = py - 18;
        if (cx + 14 + 104 > window.innerWidth - 8) lx = px - 118;
        if (cy - 18 < 4) ly = py + 14;

        Object.assign(clickCoordLabel.style, { display: 'block', left: lx + 'px', top: ly + 'px' });
        clickCoordLabel.textContent = '(' + cx + ', ' + cy + ')';
    }, true);

    // =========================================================================
    // 3. Event log — bottom bar, full width, pushes page content up
    // =========================================================================

    var PANEL_OPEN_H  = 240; // px when expanded
    var PANEL_CLOSE_H = 34;  // px when collapsed (header only)
    var LOG_MAX = 120;

    // --- Build the bar ---
    // Part of the normal document flow — appended after all page content.
    // Never floats, never overlaps anything.
    var bar = el('div', {
        width: '100%',
        height: PANEL_OPEN_H + 'px',  // starts expanded
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        fontSize: '11px',
        boxShadow: '0 -3px 14px rgba(0,0,0,0.3)',
        boxSizing: 'border-box',
        marginTop: '8px',
    });

    // Header
    var header = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '0 10px',
        height: PANEL_CLOSE_H + 'px',
        background: 'linear-gradient(90deg, #2c1a2e, #1a1a3e)',
        color: '#e0b0f0',
        fontWeight: 'bold', fontSize: '12px',
        flexShrink: '0',
        cursor: 'ns-resize',
        userSelect: 'none',
    });

    var titleSpan = el('span', { flex: '1' });
    titleSpan.textContent = '\u26a1 Event Log';

    var countBadge = el('span', {
        background: 'rgba(255,105,180,0.3)',
        color: '#ffb0d8',
        borderRadius: '10px',
        padding: '0 7px',
        fontSize: '10px',
        fontWeight: 'normal',
    });
    countBadge.textContent = '0 events';

    function mkBtn(label) {
        var b = el('button', {
            background: 'rgba(255,255,255,0.12)',
            border: 'none', borderRadius: '4px',
            color: '#e0b0f0', fontSize: '10px',
            padding: '2px 8px', cursor: 'pointer',
            fontFamily: 'monospace',
        });
        b.textContent = label;
        return b;
    }
    var clearBtn  = mkBtn('Clear');
    var toggleBtn = mkBtn('\u25bc');

    header.appendChild(titleSpan);
    header.appendChild(countBadge);
    header.appendChild(clearBtn);
    header.appendChild(toggleBtn);

    // Log list — visible by default (bar starts expanded)
    var logList = el('div', {
        flex: '1',
        overflowY: 'auto',
        background: 'rgba(14,8,20,0.95)',
        backdropFilter: 'blur(4px)',
    });

    bar.appendChild(header);
    bar.appendChild(logList);

    // Append bar after all page content — in normal document flow, never overlaps anything.
    function attachBar() {
        if (document.body && !document.getElementById('__debug_overlay_bar__')) {
            bar.id = '__debug_overlay_bar__';
            document.body.appendChild(bar);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachBar);
    } else {
        attachBar();
    }

    // --- Collapse / expand ---
    var isOpen = true;

    function setOpen(open) {
        isOpen = open;
        bar.style.height = (open ? PANEL_OPEN_H : PANEL_CLOSE_H) + 'px';
        logList.style.display = open ? '' : 'none';
        toggleBtn.textContent = open ? '\u25bc' : '\u25b2';
    }

    toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!isOpen);
    });
    clearBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        logList.innerHTML = '';
        totalCount = 0;
        countBadge.textContent = '0 events';
    });

    // --- Event rows ---
    var totalCount = 0;
    var lastRow = null;   // DOM node of most recent row
    var lastKey  = '';    // "type|target" string for merge detection

    var EVENT_COLORS = {
        focus:       '#a8e6cf',
        blur:        '#6abf8a',
        click:       '#ff69b4',
        mousedown:   '#ff8cc8',
        mouseup:     '#ffb0d8',
        dblclick:    '#ff1493',
        contextmenu: '#ffa040',
        keydown:     '#87cefa',
        keyup:       '#b0d8f8',
        keypress:    '#60b0ff',
        scroll:      '#c9b8f0',
    };

    function addEvent(type, detail, targetEl) {
        if (!isOpen) return;

        totalCount++;
        countBadge.textContent = totalCount + (totalCount === 1 ? ' event' : ' events');

        var targetDesc = describeElement(targetEl);
        var key = type + '|' + targetDesc;

        // Merge consecutive identical events (same type + same target)
        if (lastRow && lastKey === key) {
            var badge = lastRow.__countBadge;
            lastRow.__hitCount = (lastRow.__hitCount || 1) + 1;
            badge.textContent = '×' + lastRow.__hitCount;
            // Update time to latest
            lastRow.__timeSpan.textContent = nowStr();
            // Update detail (e.g. coords may differ for mouse, key same for keyboard)
            if (detail && lastRow.__detailSpan) lastRow.__detailSpan.textContent = detail;
            return;
        }

        var color = EVENT_COLORS[type] || '#ccc';

        var row = el('div', {
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '1px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            lineHeight: '1.8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
        });

        var dot = el('span', {
            display: 'inline-block', width: '7px', height: '7px',
            borderRadius: '50%', background: color, flexShrink: '0',
        });

        var timeSpan = el('span', { color: 'rgba(180,180,180,0.5)', fontSize: '10px', flexShrink: '0', width: '88px' });
        timeSpan.textContent = nowStr();

        var typeSpan = el('span', { color: color, fontWeight: 'bold', width: '105px', flexShrink: '0' });
        typeSpan.textContent = type;

        var detailSpan = el('span', { color: 'rgba(220,220,220,0.85)', width: '160px', flexShrink: '0', overflow: 'hidden', textOverflow: 'ellipsis' });
        detailSpan.textContent = detail || '';

        var targetSpan = el('span', { color: 'rgba(180,180,180,0.55)', flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '80px' });
        targetSpan.textContent = '\u2192 ' + targetDesc;

        var countSpan = el('span', {
            color: '#ffb0d8', fontSize: '10px', flexShrink: '0',
            minWidth: '26px', textAlign: 'right',
        });

        row.appendChild(dot);
        row.appendChild(timeSpan);
        row.appendChild(typeSpan);
        row.appendChild(detailSpan);
        row.appendChild(targetSpan);
        row.appendChild(countSpan);

        row.__countBadge  = countSpan;
        row.__timeSpan    = timeSpan;
        row.__detailSpan  = detailSpan;
        row.__hitCount    = 1;

        // Newest at top + scroll into view
        logList.insertBefore(row, logList.firstChild);
        logList.scrollTop = 0;

        // Trim old entries
        while (logList.children.length > LOG_MAX) {
            logList.removeChild(logList.lastChild);
        }

        lastRow = row;
        lastKey = key;
    }

    // --- Attach listeners ---

    // focus/blur: show element name prominently in the detail column
    document.addEventListener('focus', function (e) {
        addEvent('focus', describeElement(e.target), e.target);
    }, true);
    document.addEventListener('blur', function (e) {
        addEvent('blur', describeElement(e.target), e.target);
    }, true);

    // mouse events
    ['click', 'mousedown', 'mouseup', 'dblclick', 'contextmenu'].forEach(function (name) {
        document.addEventListener(name, function (e) {
            var d = '(' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + ')';
            if (e.button > 0) d += ' b' + e.button;
            addEvent(name, d, e.target);
        }, true);
    });

    // keyboard events
    ['keydown', 'keyup', 'keypress'].forEach(function (name) {
        document.addEventListener(name, function (e) {
            var key = e.key === ' ' ? 'Space' : e.key;
            var mods = (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') +
                       (e.metaKey ? 'Meta+' : '') + (e.shiftKey ? 'Shift+' : '');
            addEvent(name, mods + '"' + key + '"', e.target);
        }, true);
    });

    // scroll events — every event logged, merged when consecutive so they don't flood
    window.addEventListener('scroll', function (e) {
        var target = e.target === document ? document.scrollingElement || document.body : e.target;
        var sx = Math.round(target.scrollLeft !== undefined ? target.scrollLeft : window.scrollX);
        var sy = Math.round(target.scrollTop  !== undefined ? target.scrollTop  : window.scrollY);
        addEvent('scroll', 'x=' + sx + ' y=' + sy, target);
    }, true);

})();
