/*
* Plugin:   Pretius APEX Badge
* Version:  24.2.0
*
* License:  MIT License Copyright 2025 Pretius Sp. z o.o. Sp. K.
* Homepage: 
* Mail:     apex-plugins@pretius.com
* Issues:   https://github.com/Pretius/pretius-apex-badge/issues
*
* Author:   Matt Mulvaney
* Mail:     mmulvaney@pretius.com
* Twitter:  Matt_Mulvaney
*
*/

var pnc = (function () {
    "use strict";


    var render = function render(options) {
        var debugPrefix = 'Pretius Badge Notification: ';
        apex.debug.info(debugPrefix + 'render', options);

        extendOnPositionChanged();
        fetchBadgeLabel(options);

    };

    var elementVisible = function elementVisible(o) {
        return $(o).width() != 0;
    }

    // https://stackoverflow.com/a/18743145
    var extendOnPositionChanged = function extendOnPositionChanged() {
        if (typeof jQuery.fn.onPositionChanged == 'undefined') {
            jQuery.fn.onPositionChanged = function (trigger, millis) {
                if (millis == null) millis = 100;
                var o = $(this[0]); // our jquery object
                if (o.length < 1) return o;

                var lastPos = null;
                var lastOff = null;
                var lastVis = null;
                var lastWid = null;

                setInterval(function () {

                    // MM: Visibility Check Start
                    if (lastVis == null) lastVis = (elementVisible(o));
                    var newVis = (elementVisible(o));
                    if (lastVis != newVis) {
                        var hexId = $(o).attr('associatedElement');

                        if (newVis) {
                            $('.notification-badge[associatedElement="' + hexId + '"]').removeClass('notification-badge-invisible');
                            lastPos = lastPos + 0.0001; // Hack to realign after class removal
                            lastVis = true;
                        } else {
                            $('.notification-badge[associatedElement="' + hexId + '"]').addClass('notification-badge-invisible');
                            lastVis = false;
                        };
                    }

                    // MM: Right edge resize support
                    if (lastWid == null) lastWid = $(o).width();
                    var newWid = $(o).width();
                    if (lastWid != newWid && elementVisible(o)) lastPos = lastPos + 0.0001; // Hack to realign


                    if (o == null || o.length < 1) return o; // abort if element is non existend eny more
                    if (lastPos == null) lastPos = o.position();
                    if (lastOff == null) lastOff = o.offset();
                    var newPos = o.position();
                    var newOff = o.offset();
                    if (lastPos.top != newPos.top || lastPos.left != newPos.left) {
                        $(this).trigger('onPositionChanged', { lastPos: lastPos, newPos: newPos });
                        if (typeof (trigger) == "function") trigger(lastPos, newPos);
                        lastPos = o.position();
                    }
                    if (lastOff.top != newOff.top || lastOff.left != newOff.left) {
                        $(this).trigger('onOffsetChanged', { lastOff: lastOff, newOff: newOff });
                        if (typeof (trigger) == "function") trigger(lastOff, newOff);
                        lastOff = o.offset();
                    }

                }, millis);

                return o;
            };
        }
    }

    var applyBadge = function applyBadge(options, pLabel, spinner) {

        $.each(options.da.affectedElements, function (i, cEl) {

            //  Get association Hex
            var hexId = $(cEl).attr('associatedElement');

            if (!hexId) {
                // https://stackoverflow.com/a/68796056 gets a random string
                hexId = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
            }

            // Escape
            if (options.da.action.attribute04 == 'Y' && 
                typeof pLabel != 'undefined' ) {
                pLabel = apex.util.escapeHTML(pLabel);
            }

            // Hide Zero
            var vShowZero = false;
            if (options.da.action.attribute12 == 'Y') vShowZero = true;

            var attachmentElement = options.da.action.attribute08,
                $attachmentElement = cEl;

            // Apply badge
            if (attachmentElement == 'BODY') {
                $attachmentElement = 'body';
            }

            $($attachmentElement).badge(pLabel, null, vShowZero, hexId, spinner, options);

            // Associate Badge/Element
            $(cEl).attr('associatedElement', hexId);

            // Get Badge
            var badge = $('.notification-badge[associatedElement="' + hexId + '"]')

            /// Stick Elements together
            stickToElement(options, cEl);

            if (elementVisible(cEl)) {
                $(badge).removeClass('notification-badge-invisible');
            }

            if (!spinner) {
                $(badge).removeClass('notification-badge-spinner');
                $(badge).find('.u-Processing').remove();
            }

            $(cEl).onPositionChanged(function () {
                stickToElement(options, cEl);
            });

        });

    };

    // https://stackoverflow.com/a/18082175
    var evil = function evil(fn) {
        return new Function('return ' + fn)();
    };

    // https://stackoverflow.com/a/18743145
    var stickToElement = function stickToElement(options, pThis) {
        var hAdjust = Number(options.da.action.attribute09); // fine tune x
        var vAdjust = Number(options.da.action.attribute10); // fine tune y

        // Get Badge
        var hexId = $(pThis).attr('associatedElement');
        var notificationElement = $('.notification-badge[associatedElement="' + hexId + '"]');

        // Get Widths
        var widthEnotificationElement = $(notificationElement).outerWidth();
        var widthElement = $(pThis).outerWidth();

        // Get Left Edge
        var leftOffset = Math.max(widthElement - widthEnotificationElement, 0) + hAdjust;

        // Calc x/y 
        var horizontal_position = $(pThis).offset().left + leftOffset;
        var vertical_position = ($(pThis).offset().top - $(notificationElement).height() ) + vAdjust;

        // Set new x/y offset edge postions
        $(notificationElement).offset({ top: vertical_position, left: horizontal_position });
    };

    var fetchBadgeLabel = function fetchBadgeLabel(options) {

        // Show Spinner
        if (options.da.action.attribute11 == 'Y') applyBadge(options, '...', 'Y');

        // Get Label
        if (options.da.action.attribute01 == 'JS_EXPRESSION') {
            applyBadge(options, evil(options.da.action.attribute05));
        } else {

            var vpageItems = [];
            if (typeof options.da.action.attribute03 == 'string') {
                vpageItems = options.da.action.attribute03.split(',');
            }

            apex.server.plugin(options.opt.ajaxIdentifier, {
                pageItems: vpageItems
            }, {
                // Success function
                success: function (data) {
                    // Apply Badge
                    applyBadge(options, data.value);
                },
                // Error function
                error: function (pData, pErr, pErrorMessage) {
                    ajaxErrorHandler(options, pData, pErr, pErrorMessage);
                }
            });
        }
    }

    var ajaxErrorHandler = function ajaxErrorHandler(options, pData, pErr, pErrorMessage) {

        // Remove possible Error State Spinner/Badge
        $.each(options.da.affectedElements, function (i, cEl) {
            //  Get association Hex
            var hexId = $(cEl).attr('associatedElement');
            // Get Badge
            var badge = $('.notification-badge[associatedElement="' + hexId + '"]')
            // Remove Badge
            $(badge).parent('.notification-badge-url').remove();
            $(badge).remove();
        });

        apex.message.clearErrors();
        apex.message.showErrors([{
            type: "error",
            location: ["page"],
            message: '[Pretius Badge Notification] ' + pErrorMessage + '<br>Please check browser console.',
            unsafe: false
        }]);

        apex.debug.log(pData, pErr, pErrorMessage);
    }

    return {
        render: render,
        ajaxErrorHandler: ajaxErrorHandler
    }

})();