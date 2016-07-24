/* =============================================================
 * notate.js v1.0.0
 * https://github.com/mayankcpdixit/notatejs
 * =============================================================
 * The MIT License (MIT)
 * Copyright (c) 2016 Mayank Dixit
 * ============================================================ */

(function(global, Notate) {
  global.Notate = Notate();
})(this, function() {

  var WRAPPER_ELEM_TAG = "span";
  var WRAPPER_ELEM_STYLE = "display: inline; background-color: rgba(255, 255, 0, 0.5); color: #5ca2c9;";
  var CONTEXT_CONTAINER_CLASS = "note_details";
  var STATUS_FAIL = 0;
  var STATUS_SUCCESS = 1;
  var ERROR_LOG_COLOR = "color: red; font-weight: 700;";

  var Notate = function(options) {
    options = options || {};
    WRAPPER_ELEM_STYLE = options.WRAPPER_ELEM_STYLE || WRAPPER_ELEM_STYLE;
    WRAPPER_ELEM_TAG = options.WRAPPER_ELEM_TAG || WRAPPER_ELEM_TAG;
    CONTEXT_CONTAINER_CLASS = options.CONTEXT_CONTAINER_CLASS || CONTEXT_CONTAINER_CLASS;
    this.selectionInfo = {};

    if (!document.getElementsByClassName(CONTEXT_CONTAINER_CLASS).length) {
      log("%c- CONTEXT_CONTAINER_CLASS not present in the DOM.", ERROR_LOG_COLOR);
    }
  }

  function log() {
    if (console) {
      var args = Array.prototype.slice.call(arguments);
      console.log.apply(console, args);
    }
  };

  function getParentForClass(el, cls) {
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el;
  }

  /*
   *   Taken from:
   *   http://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
   */
  function ssWindow(containerEl) {
    if (!containerEl) {
      console.log("containerEl not present");
      return {};
    }
    var range = window.getSelection().getRangeAt(0);
    var preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    var start = preSelectionRange.toString().length;

    return {
      start: start,
      end: start + range.toString().length
    }
  };

  /*
   *   Taken from:
   *   http://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
   */
  function rsWindow(containerEl, savedSel) {
    if (!containerEl) {
      console.log("containerEl not present");
      return {};
    }
    if (!saveSelection) {
      console.log("savedSel not present");
      return {};
    }
    var charIndex = 0,
      range = document.createRange();
    range.setStart(containerEl, 0);
    range.collapse(true);
    var nodeStack = [containerEl],
      node, foundStart = false,
      stop = false;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType == 3) {
        var nextCharIndex = charIndex + node.length;
        if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        var i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /*
   *   Taken from:
   *   http://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
   */
  function ssDoc(containerEl) {
    if (!containerEl) {
      console.log("containerEl not present");
      return {};
    }
    var selectedTextRange = document.selection.createRange();
    var preSelectionTextRange = document.body.createTextRange();
    preSelectionTextRange.moveToElementText(containerEl);
    preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
    var start = preSelectionTextRange.text.length;

    return {
      start: start,
      end: start + selectedTextRange.text.length
    }
  };

  /*
   *   Taken from:
   *   http://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
   */
  function rsDoc(containerEl, savedSel) {
    if (!containerEl) {
      console.log("containerEl not present");
      return {};
    }
    if (!saveSelection) {
      console.log("savedSel not present");
      return {};
    }
    var textRange = document.body.createTextRange();
    textRange.moveToElementText(containerEl);
    textRange.collapse(true);
    textRange.moveEnd("character", savedSel.end);
    textRange.moveStart("character", savedSel.start);
    textRange.select();
  };

  var saveSelection, restoreSelection;
  if (window.getSelection && document.createRange) {
    saveSelection = ssWindow;
    restoreSelection = rsWindow;
  } else if (document.selection && document.body.createTextRange) {
    saveSelection = ssDoc;
    restoreSelection = rsDoc
  }

  Notate.prototype = {
    constructor: Notate,
    gatherSelectionInfo: function() {
      var self = this;
      var selection = getSelection();
      var nodeElem, baseNodeElem, extentNodeElem, focusNodeElem;
      var selectionInfo, selectionMeta, noteContainer;

      /*
       *   selection is in context
       */
      nodeElem = !!selection.anchorNode ? getParentForClass(selection.anchorNode.parentNode, CONTEXT_CONTAINER_CLASS) : null;
      baseNodeElem = !!selection.baseNode ? getParentForClass(selection.baseNode.parentNode, CONTEXT_CONTAINER_CLASS) : null;
      extentNodeElem = !!selection.extentNode ? getParentForClass(selection.extentNode.parentNode, CONTEXT_CONTAINER_CLASS) : null;
      focusNodeElem = !!selection.focusNode ? getParentForClass(selection.focusNode.parentNode, CONTEXT_CONTAINER_CLASS) : null;

      var isValidSelectionEndpoints = !!nodeElem && !!baseNodeElem && !!extentNodeElem && !!focusNodeElem;
      var isScopedSelection = nodeElem === baseNodeElem && extentNodeElem === nodeElem && focusNodeElem === nodeElem;

      if (isValidSelectionEndpoints) {
        selectionMeta = saveSelection(nodeElem);
        selectionMeta.content = window.getSelection().toString().trim();
        selectionMeta.timestamp = new Date().getTime();
      }

      selectionInfo = {
        isAnnotableSelection: (isValidSelectionEndpoints && isScopedSelection && selectionMeta.start !== selectionMeta.end),
        selectionRangeCount: selection.rangeCount,
        selectionMeta: selectionMeta,
        selectionRange: selection.rangeCount > 0 ? selection.getRangeAt(0) : {}
      };

      self.selectionInfo = selectionInfo.isAnnotableSelection ? selectionInfo : self.selectionInfo;
      return selectionInfo;
    },
    /*
     *   Taken from:
     *   http://stackoverflow.com/questions/1730967/how-to-wrap-with-html-tags-a-cross-boundary-dom-selection-range#19987884
     *   http://jsfiddle.net/mayankcpdixit/2t8k59jz/
     *   Modified by mayank
     */
    markAnnotation: function() {
      var self = this;
      var selection, status;

      function getAllDescendants(node, callback) {
        for (var i = 0; i < node.childNodes.length; i++) {
          var child = node.childNodes[i];
          getAllDescendants(child, callback);
          callback(child);
        }
      }

      function glueSplitElements(firstEl, secondEl) {
        var done = false,
          result = [];

        if (firstEl === undefined || secondEl === undefined) {
          return false;
        }

        if (firstEl.nodeName === secondEl.nodeName) {
          result.push([firstEl, secondEl]);

          while (!done) {
            firstEl = firstEl.childNodes[firstEl.childNodes.length - 1];
            secondEl = secondEl.childNodes[0];

            if (firstEl === undefined || secondEl === undefined) {
              break;
            }

            if (firstEl.nodeName !== secondEl.nodeName) {
              done = true;
            } else {
              result.push([firstEl, secondEl]);
            }
          }
        }

        for (var i = result.length - 1; i >= 0; i--) {
          var elements = result[i];
          while (elements[1].childNodes.length > 0) {
            elements[0].appendChild(elements[1].childNodes[0]);
          }
          elements[1].parentNode.removeChild(elements[1]);
        }

      }

      if (!!self.selectionInfo.isAnnotableSelection && self.selectionInfo.selectionRangeCount > 0) {
        if (self.selectionInfo.selectionMeta.start === self.selectionInfo.selectionMeta.end) {
          log("%c- Not a valid selection.", ERROR_LOG_COLOR);
          return;
        }

        var range = self.selectionInfo.selectionRange,
          rangeContents = range.extractContents(),
          nodesInRange = rangeContents.childNodes,
          nodesToWrap = [];

        for (var i = 0; i < nodesInRange.length; i++) {
          if (nodesInRange[i].nodeName.toLowerCase() === "#text") {
            nodesToWrap.push(nodesInRange[i]);
          } else {
            getAllDescendants(nodesInRange[i], function(child) {
              if (child.nodeName.toLowerCase() === "#text") {
                nodesToWrap.push(child);
              }
            });
          }
        };


        for (var i = 0; i < nodesToWrap.length; i++) {
          var child = nodesToWrap[i],
            wrap = document.createElement(WRAPPER_ELEM_TAG);
          wrap.setAttribute("style", WRAPPER_ELEM_STYLE);
          wrap.setAttribute("id", "annotation-" + self.selectionInfo.selectionMeta.timestamp);
          wrap.classList.add("annotation");
          if (child.nodeValue.replace(/(\s|\n|\t)/g, "").length !== 0) {
            child.parentNode.insertBefore(wrap, child);
            wrap.appendChild(child);

            // add events on annotation elements
            // for (var j = self.annotationevents.length - 1; j >= 0; j--) {
            //     wrap.addEventListener(self.annotationevents[j].eventName, self.annotationevents[j].eventHandler);
            // }
          } else {
            wrap = null;
          }
        }

        var firstChild = rangeContents.childNodes[0];
        var lastChild = rangeContents.childNodes[rangeContents.childNodes.length - 1];

        range.insertNode(rangeContents);

        glueSplitElements(firstChild.previousSibling, firstChild);
        glueSplitElements(lastChild, lastChild.nextSibling);

        rangeContents = null;
        window.getSelection().removeAllRanges();
        status = STATUS_SUCCESS;
      } else {
        log("%c- Could not annotate. Not enough data.", ERROR_LOG_COLOR, self.selectionInfo);
        status = STATUS_FAIL;
      }
      return {
        status: status,
        annotation: self.selectionInfo.selectionMeta
      };
    },

    /*
     *   Taken from:
     *   http://stackoverflow.com/questions/1730967/how-to-wrap-with-html-tags-a-cross-boundary-dom-selection-range#19987884
     *   http://jsfiddle.net/mayankcpdixit/2t8k59jz/
     */
    restoreAnnotation: function(s) {
      var self = this;

      s = (typeof s === "string") ? JSON.parse(s) : s;

      restoreSelection(document.getElementsByClassName(CONTEXT_CONTAINER_CLASS)[0], s);
      var sel = self.gatherSelectionInfo();
      if (sel.selectionMeta.content === s.content) {
        self.selectionInfo.selectionMeta.messageId = s.messageId;
        self.markAnnotation();
      }

      window.getSelection().removeAllRanges();
    }
  }
  return Notate;
});