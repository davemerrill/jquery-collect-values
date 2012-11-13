/**
* $().collectValues:
*		returns an object containing the effective values of requested fields within the containers and/or fields in the matched set
*		items in the matched set can also be fields themselves
*
* @param options obj
*		@options.selector string, default ':input:not(:button,:file)'
*			jQuery find() selector applied to the container elements in the matched set to find fields to collect
*			ignored for items in the matched set that are fields, not container elements
*		@options.defaults optional object, default {}
*			obj with default values for fields that might not exist
*			can also be used ot add other data fields to the returned data (i.e., field will never exist)
*		@options.skip optional string, default ''
*			comma-delimited list of fields to omit from result data
*			must be in the stripped and prefixed form it would be in the result; case insensitive
*		@options.multiCheckboxNames optional string, default '':
*			comma-delimited list of checkbox names to return as a (possibly empty) array of values from the checked items
*		@options.nameStripRegex optional string, default '':
*			regex to remove from the element's id or name to get the field name used in the returned data
*		@options.nameAddPrefix optional string, default '':
*			string to add to the start of the element's id or name to get the field name used in the returned data
*
* @return obj: an object keyed by the id or name of the found elements, whose value is the effective value of that item
*		checkboxes listed in multiCheckboxNames are assumed multiple, and return an array of the values of the checked ones
*		other checkboxes are assumed to be single, and return 1 if checked else 0, ignoring their actual value
*		values of all other items return a string
*
* NOTES
*		by default
*			doesn't omit hidden, disabled, or read-only fields
*			doesn't omit fields with no name, except for checkboxes listed in multiCheckboxNames and radios, which require a name to work correctly
*			DOES omit buttons and file fields
**/
(function($)
{
	$.fn.collectValues = function(options)
	{
		var settings = $.extend
		(
			{},
			{
				selector: ':input:not(:button,:file)', // input, textarea, and select fields, except buttons and file fields
				defaults: {},
				skip: '',
				multiCheckboxNames: '',
				nameStripRegex: '',
				nameAddPrefix: ''
			},
			options
		);
		settings.multiCheckboxNames = settings.multiCheckboxNames.toLowerCase();
		var data = $.extend({}, settings.defaults),
			stripRE = settings.nameStripRegex ? new RegExp(options.nameStripRegex, 'gi') : null,
			skipFields = settings.skip.toLowerCase().split(','),
			$container, $containerFields, $nameFields, isCheckboxRadio, isMultiCheckbox, fieldName, fieldNameLC;
		this.each(function()
		{
			$container = $(this);
			// if this item in the matched set is itself an input, read it, otherwise look for fields within it using the spec'd filter
			$containerFields = (['INPUT','SELECT','TEXTAREA'].indexOf($container.get(0).nodeName) >= 0) ? $container : $container.find(settings.selector);
			$containerFields.each(function(index, field)
				{
					if (field.type === 'radio' && !field.name)
						return true; // skip, unworkable, should throw maybe?
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
								isMultiCheckbox = (settings.multiCheckboxNames.indexOf(fieldNameLC) >= 0);
								if (field.name && (isMultiCheckbox || field.type === 'radio'))
									$nameFields =  $container.find('input[type="' + field.type + '"][name="' + field.name + '"]'); // get all fields w this type and name
								if (field.type === 'radio')
								{
									$nameFields.each(function(index, field)
									{
										if (field.checked)
										{
											data[fieldName] = field.value;
											return false; // find the checked radio, break out of each() loop
										}
										return true;
									});
									data[fieldName] = (data[fieldName] === undefined) ? '' : data[fieldName];
								}
								else if (isMultiCheckbox)
								{
									data[fieldName] = [];
									$nameFields.each(function(index, field)
									{
										if (field.checked)
											data[fieldName].push(field.value);
									});
								}
								else
									data[fieldName] = field.checked ? 1 : 0;
							}
						}
						else
							data[fieldName] = $(field).val();
					}
				});
		});
		return data;
	};
})(jQuery);