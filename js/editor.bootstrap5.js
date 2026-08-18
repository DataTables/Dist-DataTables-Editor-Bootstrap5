/*! Editor Bootstrap 5 styling 3.0.1 for DataTables
 * Copyright (c) SpryMedia Ltd - https://datatables.net/license/plus
 */

(function(factory){
	if (typeof define === 'function' && define.amd) {
		// AMD
		define(['datatables.net-bs5', 'datatables.net-editor'], function (dt) {
			return factory(window, document, dt);
		});
	}
	else if (typeof exports === 'object') {
		// CommonJS
		var cjsRequires = function (root) {
			if (! root.DataTable) {
				require('datatables.net-bs5')(root);
			}

			if (! window.DataTable.Editor) {
				require('datatables.net-editor')(root);
			}
		};

		if (typeof window === 'undefined') {
			module.exports = function (root) {
				if (! root) {
					// CommonJS environments without a window global must pass a
					// root. This will give an error otherwise
					root = window;
				}

				cjsRequires(root);
				return factory(root, root.document, root.DataTable);
			};
		}
		else {
			cjsRequires(window);
			module.exports = factory(window, window.document, window.DataTable);
		}
	}
	else {
		// Browser
		factory(window, document, window.DataTable);
	}
}(function(window, document, DataTable) {
'use strict';



// Note that in MJS `DataTable` is imported
// In UMD `DataTable` is available

/*
 * Set the default display controller to be our bootstrap control
 */
DataTable.Editor.defaults.display = 'bootstrap';

const Dom = DataTable.Dom;
const util = DataTable.util;

/*
 * Change the default classes from Editor to be classes for Bootstrap
 */
util.object.assignDeep(DataTable.Editor.classes, {
	header: {
		wrapper: 'DTE_Header',
		title: {
			tag: 'h5',
			class: 'modal-title'
		}
	},
	body: {
		wrapper: 'DTE_Body'
	},
	footer: {
		wrapper: 'DTE_Footer'
	},
	form: {
		tag: 'form-horizontal',
		button: 'btn',
		buttonInternal: 'btn btn-outline-secondary',
		buttonSubmit: 'btn btn-primary'
	},
	field: {
		wrapper: 'DTE_Field form-group row',
		label: 'col-lg-4 col-form-label',
		input: 'col-lg-8 DTE_Field_Input',
		inputError: 'is-invalid',
		error: 'error is-invalid',
		'msg-labelInfo': 'form-text text-secondary small',
		'msg-info': 'form-text text-secondary small',
		'msg-message': 'form-text text-secondary small',
		'msg-error': 'form-text text-danger small',
		multiValue: 'card multi-value',
		multiInfo: 'small',
		multiRestore: 'multi-restore'
	}
});

util.object.assignDeep(DataTable.ext.buttons, {
	create: {
		formButtons: {
			className: 'btn-primary'
		}
	},
	edit: {
		formButtons: {
			className: 'btn-primary'
		}
	},
	remove: {
		formButtons: {
			className: 'btn-danger'
		}
	}
});

DataTable.Editor.fieldTypes.datatable.tableClass = 'table';

/*
 * Bootstrap display controller - this is effectively a proxy to the Bootstrap
 * modal control.
 */
let shown = false;
let fullyShown = false;

const domEls = {
	content: Dom
		.c('div')
		.classAdd('modal fade DTED')
		.append(Dom.c('div').classAdd('modal-dialog')),
	close: Dom.c('button').classAdd('btn-close')
};
let modal;
let _bs = window.bootstrap; // Browser loaded

DataTable.Editor.bootstrap = function (bs) {
	_bs = bs;
};

// Get the Bootstrap library from locally set (legacy) or from DT.
function getBs() {
	let dtBs = DataTable.use('bootstrap');

	if (dtBs) {
		return dtBs;
	}

	if (_bs) {
		return _bs;
	}

	throw new Error(
		'No Bootstrap library. Set it with `DataTable.use(bootstrap);`'
	);
}

DataTable.Editor.display.bootstrap = util.object.assignDeep(
	{},
	DataTable.Editor.models.displayController,
	{
		/*
		 * API methods
		 */
		init: function (dte) {
			// Add `form-control` to required elements
			dte.on('displayOrder.dtebs open.dtebs', function () {
				util.object.each(dte.s.fields, function (key, field) {
					var node = Dom.s(field.node());

					node.find(
						'input:not([type=checkbox]):not([type=radio]), select, textarea'
					).classAdd('form-control');

					node.find(
						'input[type=checkbox], input[type=radio]'
					).classAdd('form-check-input');

					node.find('select').classAdd('form-select');
				});
			});

			return DataTable.Editor.display.bootstrap;
		},

		open: function (dte, appendIn, callback) {
			if (!modal) {
				let localBs = getBs();
				modal = new localBs.Modal(domEls.content.get(0), {
					backdrop: 'static',
					keyboard: false
				});
			}

			let append = Dom.s(appendIn);

			append.classAdd('modal-content');
			append.find('.DTE_Header').classAdd('modal-header');
			append.find('.DTE_Body').classAdd('modal-body');
			append.find('.DTE_Footer').classAdd('modal-footer');

			// Special class for DataTable buttons in the form
			append
				.find('div.DTE_Field_Type_datatable div.dt-buttons')
				.classRemove('btn-group')
				.classAdd('btn-group-vertical');

			// Setup events on each show
			domEls.close
				.attr('title', dte.i18n('close'))
				.off('click.dte-bs5')
				.on('click.dte-bs5', function () {
					dte.close('icon');
				})
				.appendTo(append.find('div.modal-header'));

			// This is a bit horrible, but if you mousedown and then drag out of the modal container, we don't
			// want to trigger a background action.
			let allowBackgroundClick = false;

			Dom.s(document)
				.off('mousedown.dte-bs5')
				.on('mousedown.dte-bs5', 'div.modal', function (e) {
					allowBackgroundClick =
						Dom.s(e.target).classHas('modal') && shown ? true : false;
				});

			Dom.s(document)
				.off('click.dte-bs5')
				.on('click.dte-bs5', 'div.modal', function (e) {
					if (Dom.s(e.target).classHas('modal') && allowBackgroundClick) {
						dte.background();
					}
				});

			var content = domEls.content.find('div.modal-dialog');
			content.classAdd(DataTable.Editor.display.bootstrap.classes.modal);
			content.children().detach();
			content.append(append);

			// Floating label support - rearrange the DOM for the inputs
			if (dte.c.bootstrap && dte.c.bootstrap.floatingLabels) {
				var floating_label_types = [
					'readonly',
					'text',
					'textarea',
					'select',
					'datetime'
				];
				var fields = dte.order();

				fields
					.filter(function (f) {
						var type = dte.field(f).s.opts.type;

						return floating_label_types.includes(type);
					})
					.forEach(function (f) {
						var node = Dom.s(dte.field(f).node());
						var wrapper = node.find('.DTE_Field_InputControl');

						if (dte.field(f).s.opts.type === 'datetime') {
							wrapper.find('input').prependTo(wrapper);
						}

						var control = wrapper.children(':first-child');
						var label = node.find('label');

						wrapper
							.parent()
							.classRemove('col-lg-8')
							.classAdd('col-lg-12');
						wrapper.classAdd('form-floating');
						control.classAdd('form-control').attr('placeholder', f);
						label.appendTo(wrapper);
					});
			}

			if (shown) {
				if (callback) {
					callback();
				}
				return;
			}

			shown = true;
			fullyShown = false;

			domEls.content.get(0).addEventListener(
				'shown.bs.modal',
				function () {
					// Can only give elements focus when shown
					if (dte.s.setFocus) {
						dte.s.setFocus.focus();
					}

					fullyShown = true;

					let tables = domEls.content.find('table.dataTable');

					if (tables.count()) {
						new DataTable.Api(tables).columns.adjust();
					}

					if (callback) {
						callback();
					}
				},
				{ once: true }
			);

			domEls.content.get(0).addEventListener(
				'hidden',
				function () {
					shown = false;
				},
				{ once: true }
			);

			domEls.content.appendTo('body');

			modal.show();
		},

		close: function (dte, callback) {
			if (!shown) {
				if (callback) {
					callback();
				}
				return;
			}

			// Check if actually displayed or not before hiding. BS4 doesn't like `hide`
			// before it has been fully displayed
			if (!fullyShown) {
				domEls.content.get(0).addEventListener(
					'shown.bs.modal',
					function () {
						DataTable.Editor.display.bootstrap.close(dte, callback);
					},
					{ once: true }
				);

				return;
			}

			domEls.content.get(0).addEventListener(
				'hidden.bs.modal',
				function () {
					Dom.s(this).detach();
				},
				{ once: true }
			);

			modal.hide();

			shown = false;
			fullyShown = false;

			if (callback) {
				callback();
			}
		},

		node: function () {
			return domEls.content.get(0);
		},

		classes: {
			modal: 'modal-dialog-scrollable modal-dialog-centered modal-lg'
		}
	}
);


return DataTable.Editor;
}));
