/**
 * Illuminators plugin.
 * 
 * - Set Illuminators via dialog box.
 * - Toggle illuminators on and off. (One at a time by design.)
 * - Stateful illumination. (Required to export with Illum activated)
 *
 * TODO:
 * - Fix case sensitivity in the illuminator filter box.
 * - Enable different highlighter colors and widths assignment.
 */

// Main call to the API to load in the Plugin.
 Draw.loadPlugin(function(editorUi)
 {
     // Global constants.
     const ILLUM_WIDTH = 5;
     const ILLUM_COLOR = '#6666FE'
     
     // Adds resource for action and sets the title for the selection.
     mxResources.parse('activeIllums=Illuminators');
 
     // Adds action.
     editorUi.actions.addAction('activeIllums...', function()
     {
         if (editorUi.activeIllumsWindow == null)
         {
             editorUi.activeIllumsWindow = new ActiveIllumsWindow(editorUi, document.body.offsetWidth - 380, 120, 300, 240);
             editorUi.activeIllumsWindow.window.addListener('show', function()
             {
                 editorUi.fireEvent(new mxEventObject('activeIllums'));
             });
             editorUi.activeIllumsWindow.window.addListener('hide', function()
             {
                 editorUi.fireEvent(new mxEventObject('activeIllums'));
             });
             editorUi.activeIllumsWindow.window.setVisible(true);
             editorUi.fireEvent(new mxEventObject('activeIllums'));
         }
         else
         {
             editorUi.activeIllumsWindow.window.setVisible(!editorUi.activeIllumsWindow.window.isVisible());
         }
     });
     
     // Functionality reachable through the 'Extras' menu.
     var menu = editorUi.menus.get('extras');
     var oldFunct = menu.funct;
     menu.funct = function(menu, parent)
     {
         oldFunct.apply(this, arguments);
         
         editorUi.menus.addMenuItems(menu, ['-', 'activeIllums'], parent);
     };
 
     // Sets up the UI for controlling Illums.
     var ActiveIllumsWindow = function(editorUi, x, y, w, h)
     {
         var graph = editorUi.editor.graph;
         var propertyName = 'illums';
 
         // Initializes the general popup window.
         var div = document.createElement('div');
         div.style.overflow = 'active';
         div.style.padding = '12px 8px 12px 8px';
         div.style.height = 'auto';
         
         // Popup when 1 or more objects are selected.
         var searchInput = document.createElement('input');
         searchInput.setAttribute('placeholder', 'Type illuminator name and press Enter to add');
         searchInput.setAttribute('type', 'text');
         searchInput.style.width = '100%';
         searchInput.style.boxSizing = 'border-box';
         searchInput.style.fontSize = '12px';
         searchInput.style.borderRadius = '4px';
         searchInput.style.padding = '4px';
         searchInput.style.marginBottom = '8px';
         div.appendChild(searchInput);
 
         // Popup when no objects are selected.
         var filterInput = searchInput.cloneNode(true);
         filterInput.setAttribute('placeholder', 'Filter Illuminators');
         div.appendChild(filterInput);
 
         // Shows all available illums in a 'cloud'.
         var illumCloud = document.createElement('div');
         illumCloud.style.position = 'relative';
         illumCloud.style.fontSize = '12px';
         illumCloud.style.height = 'auto';
         div.appendChild(illumCloud);
 
         var graph = editorUi.editor.graph;
         var lastValue = null;
         
         // Pulls a specific Illum.
         function getIllumsForCell(cell)
         {
             return graph.getAttributeForCell(cell, propertyName, '');
         };
 
         // Presents all the available Illums in sorted order.
         function getAllIllumsForCells(cells)
         {
             var tokens = [];
             var temp = {};
             
             for (var i = 0; i < cells.length; i++)
             {
                 var illums = getIllumsForCell(cells[i]);
 
                 if (illums.length > 0)
                 {
                     var t = illums.toLowerCase().split(' ');
                     
                     for (var j = 0; j < t.length; j++)
                     {
                         if (temp[t[j]] == null)
                         {
                             temp[t[j]] = true;
                             tokens.push(t[j]);
                         }
                     }
                 }
             }
             tokens.sort();
             
             return tokens;
         };
         
         // Returns all Illums this cell is included in.
         function getCommonIllumsForCells(cells)
         {
             var commonTokens = null;
             var validIllums = [];
             
             for (var i = 0; i < cells.length; i++)
             {
                 var illums = getIllumsForCell(cells[i]);
                 validIllums = [];
 
                 if (illums.length > 0)
                 {
                     var tokens = illums.toLowerCase().split(' ');
                     var temp = {};
                     
                     for (var j = 0; j < tokens.length; j++)
                     {
                         if (commonTokens == null || commonTokens[tokens[j]] != null)
                         {
                             temp[tokens[j]] = true;
                             validIllums.push(tokens[j]);
                         }
                     }
                     
                     commonTokens = temp;
                 }
                 else
                 {
                     return [];
                 }
             }
         
             return validIllums;
         };
         
         // Provide the subset of Illums that matcha search bar query.
         function getLookup(illumList)
         {
             var lookup = {};
             
             for (var i = 0; i < illumList.length; i++)
             {
                 lookup[illumList[i].toLowerCase()] = true;
             }
             
             return lookup;
         };
         
         // Get all Illums.
         function getAllIllums()
         {
             return getAllIllumsForCells(graph.model.getDescendants(
                 graph.model.getRoot()));
         };
 
         // Returns true if illums exist and are all in lookup.
         function matchIllums(illums, lookup)
         {
             if (illums.length > 0)
             {
                 var tmp = illums.toLowerCase().split(' ');
                 for (var i = 0; i < tmp.length; i++)
                 {
                     if (lookup[tmp[i]] != null) 
                     {
                         return true;
                     }
                 }
                     
                 return false;
             }
             else
             {
                 return false;
             }
         };
         
         var activeIllums = {};
         var prevCellVals = {};
         var graphIsCellHighlighted = graph.isCellVisible;
 
         // Appended functionality onto isCellVisible to now apply highlight filters to activated illum.
         graph.isCellVisible = function(cell)
         {
             // Inherits functionality of isCellVisible.
            var out = graphIsCellHighlighted.apply(this, arguments);

            // Stores color and width it was before the highlight so that we can return to the color when it gets turned off.
            var style = this.getCellStyle(cell);
            var color = mxUtils.getValue(style, mxConstants.STYLE_STROKECOLOR, 'black');
            var width = mxUtils.getValue(style, mxConstants.STYLE_STROKEWIDTH, '1');
            var prevStyle = color + ':' + width;
            if (!prevStyle.includes(ILLUM_COLOR)) {
                prevCellVals[cell.getId()] = prevStyle;
            }

            // If an Illum is activated, highlight the cells associated with that Illum.
            if (matchIllums(getIllumsForCell(cell), activeIllums)) {
                graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, ILLUM_COLOR, [cell]);
                graph.setCellStyles(mxConstants.STYLE_STROKEWIDTH, ILLUM_WIDTH, [cell]);
            }
            // Return cells previously highlighted but no longer back to their original style.
            else if (cell.getId() in prevCellVals) {
                var prev = prevCellVals[cell.getId()];
                var prevStrokeColor = prev.substring(0,prev.indexOf(':'));
                var prevStrokeWidth = parseInt(prev.substring(prev.indexOf(':') + 1));
                graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, prevStrokeColor, [cell]);
                graph.setCellStyles(mxConstants.STYLE_STROKEWIDTH, prevStrokeWidth, [cell]);
            }
            return out;
        };
 
         // Updates the existing Illum icons in the Illum cloud.
         function updateSelectedIllums(illums, selected, selectedColor, filter)
         {
             illumCloud.innerHTML = '';
             
             // Illuminator window where the whole cloud of illums is visible.
             // This portion builds the popup.
             var title = document.createElement('div');
             title.style.marginBottom = '8px';
             mxUtils.write(title, (filter != null) ? 'Select illuminator:' : 'Or add/remove existing illuminator(s):');
             illumCloud.appendChild(title);
             
             var found = 0;
             for (var i = 0; i < illums.length; i++)
             {
                 if (filter == null || illums[i].substring(0, filter.length) == filter)
                 {
                     var span = document.createElement('span');
                     span.style.display = 'inline-block';
                     span.style.padding = '6px 8px';
                     span.style.borderRadius = '6px';
                     span.style.marginBottom = '8px';
                     span.style.maxWidth = '80px';
                     span.style.overflow = 'active';
                     span.style.textOverflow = 'ellipsis';
                     span.style.cursor = 'pointer';
                     span.setAttribute('title', illums[i]);
                     span.style.border = '1px solid #808080';
                     mxUtils.write(span, illums[i]);
                     
                     if (selected[illums[i]])
                     {
                         span.style.background = selectedColor;
                         span.style.color = '#ffffff';
                     }
                     else
                     {
                         span.style.background = (uiTheme == 'dark') ? 'transparent' : '#ffffff';
                     }
                     
                     // When an Illum is clicked within the popup coud.
                     mxEvent.addListener(span, 'click', (function(illum)
                     {
                         return function()
                         {
                             // If a Illum is not currently in use.
                             if (!selected[illum])
                             {
                                 // If there are cells selected, we want to add to or remove from Illums.
                                 if (!graph.isSelectionEmpty())
                                 {
                                     addIllumsToCells(graph.getSelectionCells(), [illum])
                                 }
                                // If there are no cells selected, we want to turn the highlights on and off.
                                 else
                                 {
                                     // Ensure only one highlight can be selected at a time.
                                     if (Object.keys(activeIllums).length > 0) {
                                        delete activeIllums[Object.keys(activeIllums)[0]];
                                     }
                                     // Turn on the selected Illum.
                                     activeIllums[illum] = true;
                                     refreshUi();
                                     
                                     window.setTimeout(function()
                                     {
                                         graph.refresh();
                                     }, 0);
                                 }
                             }
                             // If the Illum is already in use currently.
                             else
                             {
                                 if (!graph.isSelectionEmpty())
                                 {
                                     removeIllumsFromCells(graph.getSelectionCells(), [illum])
                                 }
                                 else
                                 {
                                     delete activeIllums[illum];
                                     refreshUi();
                                     
                                     window.setTimeout(function()
                                     {
                                         graph.refresh();
                                     }, 0);
                                 }
                             }
                         };
                     })(illums[i]));
                     
                     illumCloud.appendChild(span);
                     mxUtils.write(illumCloud, ' ');
                     found++;
                 }
             }
             if (found == 0)
             {
                 mxUtils.write(illumCloud, 'No illuminators found');
             }
         };
         
         // This occurs when illum is toggled on.
         function updateIllumCloud(illums)
         {
             updateSelectedIllums(illums, activeIllums, ILLUM_COLOR, filterInput.value);
         };
         
         function refreshUi()
         {
             if (graph.isSelectionEmpty())
             {
                 updateIllumCloud(getAllIllums(), activeIllums);
                 searchInput.style.display = 'none';
                 filterInput.style.display = '';
             }
             else
             {
                 updateSelectedIllums(getAllIllums(), getLookup(getCommonIllumsForCells(graph.getSelectionCells())), '#bb0000');
                 searchInput.style.display = '';
                 filterInput.style.display = 'none';
             }
         }
         
         refreshUi();
         
         // Assign Illums to selected cells.
         function addIllumsToCells(cells, illumList)
         {
             if (cells.length > 0 && illumList.length > 0)
             {
                 graph.model.beginUpdate();
                 
                 try
                 {
                     for (var i = 0; i < cells.length; i++)
                     {
                         var temp = getIllumsForCell(cells[i]);
                         var illums = temp.toLowerCase().split(' ');
                         
                         for (var j = 0; j < illumList.length; j++)
                         {
                             var illum = illumList[j];
                             var changed = false;
         
                             if (illums.length == 0 || mxUtils.indexOf(illums, illum) < 0)
                             {
                                 temp = (temp.length > 0) ? temp + ' ' + illum : illum;
                                 changed = true;
                             }
                         }
                         
                         if (changed)
                         {
                             graph.setAttributeForCell(cells[i], 'illums', temp);
                         }
                     }
                 }
                 finally
                 {
                     graph.model.endUpdate();
                 }
             }
         };

         // Removes illums from the selected cells.
         function removeIllumsFromCells(cells, illumList)
         {
             if (cells.length > 0 && illumList.length > 0)
             {
                 graph.model.beginUpdate();
                 
                 try
                 {
                     for (var i = 0; i < cells.length; i++)
                     {
                         var illums = getIllumsForCell(cells[i]);
                         
                         if (illums.length > 0)
                         {
                             var tokens = illums.split(' ');
                             var changed = false;
                             
                             for (var j = 0; j < illumList.length; j++)
                             {
                                 var idx = mxUtils.indexOf(tokens, illumList[j]);
                                 
                                 if (idx >= 0)
                                 {
                                     tokens.splice(idx, 1);
                                     changed = true;
                                 }
                             }
 
                             if (changed)
                             {
                                 graph.setAttributeForCell(cells[i], 'illums', tokens.join(' '));
                             }
                         }
                     }
                 }
                 finally
                 {
                     graph.model.endUpdate();
                 }
             }
         };
         
         // All below sets up the UI and listeners to trigger the above functionality.
         
         graph.selectionModel.addListener(mxEvent.EVENT_CHANGE, function(sender, evt)
         {
             refreshUi();
         });
         
         graph.model.addListener(mxEvent.EVENT_CHANGE, function(sender, evt)
         {
             refreshUi();
         });
 
         mxEvent.addListener(filterInput, 'keyup', function()
         {
             updateIllumCloud(getAllIllums());
         });
         
         mxEvent.addListener(searchInput, 'keyup', function(evt)
         {
             // Ctrl or Cmd keys.
             if (evt.keyCode == 13)
             {
                 addIllumsToCells(graph.getSelectionCells(), searchInput.value.toLowerCase().split(' '));
                 searchInput.value = '';
             }
         });
 
         this.window = new mxWindow(mxResources.get('activeIllums'), div, x, y, w, null, true, true);
         this.window.destroyOnClose = false;
         this.window.setMaximizable(false);
         this.window.setResizable(true);
         this.window.setScrollable(true);
         this.window.setClosable(true);
         this.window.contentWrapper.style.overflowY = 'scroll';
         
         this.window.addListener('show', mxUtils.bind(this, function()
         {
             this.window.fit();
             
             if (this.window.isVisible())
             {
                 searchInput.focus();
                 
                 if (mxClient.IS_GC || mxClient.IS_FF || document.documentMode >= 5)
                 {
                     searchInput.select();
                 }
                 else
                 {
                     document.execCommand('selectAll', false, null);
                 }
             }
             else
             {
                 graph.container.focus();
             }
         }));
         
         this.window.setLocation = function(x, y)
         {
             var iw = window.innerWidth || document.body.clientWidth || document.documentElement.clientWidth;
             var ih = window.innerHeight || document.body.clientHeight || document.documentElement.clientHeight;
             
             x = Math.max(0, Math.min(x, iw - this.table.clientWidth));
             y = Math.max(0, Math.min(y, ih - this.table.clientHeight - 48));
 
             if (this.getX() != x || this.getY() != y)
             {
                 mxWindow.prototype.setLocation.apply(this, arguments);
             }
         };
         
         var resizeListener = mxUtils.bind(this, function()
         {
             var x = this.window.getX();
             var y = this.window.getY();
             
             this.window.setLocation(x, y);
         });
         
         mxEvent.addListener(window, 'resize', resizeListener);
 
         this.destroy = function()
         {
             mxEvent.removeListener(window, 'resize', resizeListener);
             this.window.destroy();
         }
     };
 });
