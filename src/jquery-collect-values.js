/**
* $().collectValues:
*		returns a javascript object with the current values of requested fields within the containers in the matched set
*		items in the matched set can also be fields themselves
*
*	Copyright (c) 2012 Dave Merrill, https://github.com/davemerrill/jquery-collect-values, MIT license
*
*	@param options obj
*		all options are optional
*		@options.selector string, default ':input:not(:button,:file)'
*			jQuery find() selector applied to container elements in the matched set to find fields to collect
*			ignored for items in the matched set that are fields, not container elements
*		@options.defaults object, default {}
*			obj with default values for fields that might not exist
*			can also be used to add arbitrary fields to the returned data, with any values you like
*			defaults apply only to fields that aren't found at all, not if its value is empty string
*		@options.skip string, default ''
*			comma-delimited list of fields to omit from result data
*			as with all other field list options, must be in the stripped and prefixed form that would appear in the result
*		@options.multiCheckboxes string, default '':
*			comma-delimited list of checkbox names to return as a (possibly empty) array of values from the checked items
*		@options.valueCheckboxes string default '':
*			comma-delimited list of non-multi checkbox names that should return their actual value, not 1/0
*			see "returned values" below
*		@options.noTrimFields string, default '':
*			comma-delimited list of field names whose values should not be trimmmed
*			fields not included here trim the value in the actual field, as well as returning the trimmed value
*		@options.intFields string, default '':
*			comma-delimited list of fields whose values should be coerced to integers
*			not needed in most case, server will cope, but may be useful for pre-submit calculations
*		@options.nameStripRegex string, default '':
*			regex to remove from the element's id or name to get the field name used in the returned data
*		@options.nameAddPrefix string, default '':
*			string to add to the start of the element's id or name to get the field name used in the returned data
*
*		case sensitivity of options
*			skip, multiCheckboxes, valueCheckboxes, noTrimFields, intFields, and nameStripRegex are NOT case sensitive
*			all other options are
*
*	@return obj: an object keyed by the id or name of the found elements, whose value is the value of that item
*		returned names
*			keys in the returned object are derived from either the name or id of the element
*			for radios and checkboxes, name is used if it exists, or id if it doesn't
*			that priority is reversed for all other element types
*			fields with no name or id are silently skipped, as are radios with no name
*			the first letter of the name is lowercased, field- or argument-name style
*		returned values
*			all items except checkboxes return a string
*			checkboxes listed in multiCheckboxes are assumed multiple, and return an array of values of the checked ones
*			all other checkboxes are assumed to be single, and return a simple value
*			ones listed in valueCheckboxes return the actual value of the field if checked, else empty string
*				passing '*' as valueCheckboxes treats all non-multi checkboxes this way
*			checkboxes not listed in valueCheckboxes are assumed boolean, and return 1 if checked, else 0
*				the actual value of the checkbox field is ignored
*
*	SETTING DEFAULT OPTIONS
*		to set the default options for all subsequent uses of collectValues(), do this:
*			$.fn.collectValues.setDefaultOptions(options);
*
*	NOTES
*		by default:
*			doesn't omit hidden, disabled, or read-only fields
*			DOES omit buttons and file fields
**/
(function($)
{
	"use strict";
	$.fn.collectValues = function(options)
	{
		var settings = $.extend
		(
			{},
			$.fn.collectValues.defaultOptions,
			options
		);
		var data = $.extend({}, settings.defaults),
			stripRE = settings.nameStripRegex ? new RegExp(options.nameStripRegex, 'gi') : null,
			skipFields = settings.skip.toLowerCase().split(','),
			multiCheckboxes = settings.multiCheckboxes.toLowerCase().split(','),
			valueCheckboxes = settings.valueCheckboxes.toLowerCase().split(','),
			noTrimFields = settings.noTrimFields.toLowerCase().split(','),
			intFields = settings.intFields.toLowerCase().split(','),
			valueCheckboxesAll = (valueCheckboxes.length > 0 && valueCheckboxes[0] === '*'),
			INPUT_NODE_NAMES = ['INPUT','SELECT','TEXTAREA'],
			$container, $containerFields, $nameFields, $field, isCheckboxRadio, isMultiCheckbox, fieldName, fieldNameLC, values;
		this.each(function()
		{
			$container = $(this);
			// if this item in the matched set is itself a field, read it, otherwise look for fields within it using the spec'd selector
			$containerFields = (INPUT_NODE_NAMES.indexOf($container.get(0).nodeName) >= 0) ? $container : $container.find(settings.selector);
			$containerFields.each(function(index, field)
			{
				if (field.type === 'radio' && !field.name)
					return true; // skip, unworkable, in html, not just for us, should throw maybe?
				isCheckboxRadio = (field.type === 'checkbox' || field.type === 'radio');
				fieldName = isCheckboxRadio ? (field.name || field.id) : (field.id || field.name);
				if (fieldName)
				{
					fieldName = stripRE ? fieldName.replace(stripRE, '') : fieldName;
					fieldName = settings.nameAddPrefix + fieldName.substr(0, 1).toLowerCase() + fieldName.substr(1);
					fieldNameLC = fieldName.toLowerCase();
					if (skipFields.indexOf(fieldNameLC) >= 0)
						{} // skipped field, do nothing
					else if (isCheckboxRadio)
					{
						if (data[fieldName] === undefined) // only return one value, regardless of how many fields like this there are
						{
							isMultiCheckbox = (multiCheckboxes.indexOf(fieldNameLC) >= 0);
							if (field.name && (isMultiCheckbox || field.type === 'radio'))
								$nameFields =  $container.find('input[name="' + field.name + '"]'); // get all fields w this name
							if (field.type === 'radio')
							{
								$nameFields.each(function(index, field)
								{
									if (field.checked)
									{
										data[fieldName] = field.value;
										return false; // found a checked radio, break out of $containerFields.each()
									}
								});
								data[fieldName] = (data[fieldName] === undefined) ? '' : data[fieldName];
							}
							else if (isMultiCheckbox)
							{
								values = [];
								$nameFields.each(function(index, field)
								{
									if (field.checked)
										values[values.length] = (intFields.indexOf(fieldNameLC) >= 0) ? parseInt(field.value, 10) : field.value;
								});
								data[fieldName] = values;
							}
							else if (valueCheckboxesAll || valueCheckboxes.indexOf(fieldNameLC) >= 0)
								data[fieldName] = field.checked ? field.value : '';
							else
								data[fieldName] = field.checked ? 1 : 0;
						}
					}
					else if (noTrimFields.indexOf(fieldNameLC) >= 0)
						data[fieldName] = $(field).val();
					else
					{
						$field = $(field);
						data[fieldName] = $field.val().trim();
						$field.val(data[fieldName]);
					}
					if (data[fieldName] !== undefined && typeof data[fieldName] === 'string' && intFields.indexOf(fieldNameLC) >= 0)
						data[fieldName] =  parseInt(data[fieldName], 10);
				}
			});
		});
		return data;
	};
})(jQuery);

$.fn.collectValues.defaultOptions =
{
	selector: ':input:not(:button,:file)', // input, textarea, and select fields, except buttons and file fields
	defaults: {},
	skip: '',
	multiCheckboxes: '',
	valueCheckboxes: '',
	nameStripRegex: '',
	nameAddPrefix: '',
	noTrimFields: '',
	intFields: ''
};

$.fn.collectValues.setDefaultOptions = function(options)
{
	"use strict";
	$.fn.collectValues.defaultOptions = $.extend
	(
		$.fn.collectValues.defaultOptions,
		options
	);
};

$.fn.collectValues.version = '0.1.1';
