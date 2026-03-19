exports.getActions = function () {

	let actions = {};
	const hasTrans16 = Array.isArray(this.model.trans) && this.model.trans.some((item) => String(item.id) === '16');
	const hasTrans17 = Array.isArray(this.model.trans) && this.model.trans.some((item) => String(item.id) === '17');
	const virtualFlexChoices = [];
	if (!this.model.legacy_dvip && hasTrans16) {
		virtualFlexChoices.push({ id: 'dv_virtual_flex1', label: 'Flex1 (Run + Flex)' });
	}
	if (!this.model.legacy_dvip && hasTrans17) {
		virtualFlexChoices.push({ id: 'dv_virtual_flex2', label: 'Flex2 (Run + Flex)' });
	}

	const hasFlexOnPgm = Array.isArray(this.model.pgm) && this.model.pgm.some((item) => String(item.label).toLowerCase() === 'flex');
	const hasFlexOnPvw = Array.isArray(this.model.pvw) && this.model.pvw.some((item) => String(item.label).toLowerCase() === 'flex');
	const switchPgmChoices = hasFlexOnPgm ? this.model.pgm.concat(virtualFlexChoices) : this.model.pgm;
	const switchPvwChoices = hasFlexOnPvw ? this.model.pvw.concat(virtualFlexChoices) : this.model.pvw;

	actions['switch_pgm'] = {
		label: 'Switch PGM',
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'switchpgm',
				default: '0',
				choices: switchPgmChoices
			}
		]
	};

	actions['switch_pvw'] = {
		label: 'Switch PVW',
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'switchpvw',
				default: '0',
				choices: switchPvwChoices
			}
		]
	};
	actions['trans'] = {
		label: 'Transition Controls',
		options: [
			{
				type: 'dropdown',
				label: 'Action',
				id: 'trans',
				default: '0',
				choices: this.model.trans
			}
		]
	};
	if (this.config.modelID != 'se2200') {
		actions['trans_btn'] = {
			label: 'Additional Transition Controls',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'trans',
					default: '7',
					choices: this.model.trans_btn
				}
			]
		};
	}
	actions['keyer'] = {
		label: 'Keyer Controls',
		options: [
			{
				type: 'dropdown',
				label: 'Action',
				id: 'keyer',
				default: '0',
				choices: this.model.keyer
			}
		]
	};
	if (!this.model.legacy_dvip) {
		actions['set_wipe'] = {
			label: 'Select Wipe',
			options: [
				{
					type: 'number',
					label: 'Wipe Number',
					id: 'wipe',
					min: 1,
					max: 100,
					default: '1'
				}
			]
		};
	} else {
		actions['set_wipe'] = {
			label: 'Select Wipe',
			options: [
				{
					type: 'dropdown',
					label: 'Wipe',
					id: 'wipe',
					default: '0',
					choices: this.model.wipe
				}
			]
		};
	}
	if (this.config.modelID != 'se2200') {
		actions['switch_key1'] = {
			label: 'Switch Key 1 Aux',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchkey1',
					default: '0',
					choices: this.model.key1
				}
			]
		};

		if (this.config.modelID != 'se700' && this.config.modelID != 'se650') {
			actions['switch_key2'] = {
				label: 'Switch Key 2 Aux',
				options: [
					{
						type: 'dropdown',
						label: 'Input',
						id: 'switchkey2',
						default: '0',
						choices: this.model.key2
					}
				]
			};
		}
	}
	if (this.config.modelID == 'se3200') {
		actions['switch_key3'] = {
			label: 'Switch Key 3 Aux',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchkey3',
					default: '0',
					choices: this.model.key3
				}
			]
		};
	}

	if (this.config.modelID == 'se3200') {
		actions['switch_key4'] = {
			label: 'Switch Key 4 Aux',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchkey4',
					default: '0',
					choices: this.model.key4
				}
			]
		};
	}
	if (this.config.modelID == 'se700' || this.config.modelID == 'se650') {
		actions['switch_pip'] = {
			label: 'Switch PIP Aux',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchpip',
					default: '0',
					choices: this.model.pip
				}
			]
		};
	}
	if (this.config.modelID != 'se2200') {
		actions['switch_dsk1'] = {
			label: 'Switch DSK 1 Aux',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchdsk1',
					default: '0',
					choices: this.model.dsk1
				}
			]
		};
	}

	if (this.config.modelID != 'se700' && this.config.modelID != 'se650' && this.config.modelID != 'se2200') {
		actions['switch_dsk2'] = {
			label: 'Switch DSK 2 Aux',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchdsk2',
					default: '0',
					choices: this.model.dsk2
				}
			]
		};
	}
	if (this.config.modelID == 'se3200') {
		actions['switch_aux1'] = {
			label: 'Switch Aux 1',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchaux1',
					default: '0',
					choices: this.model.aux1
				}
			]
		};
	}
	if (this.config.modelID == 'se3200') {
		actions['switch_aux2'] = {
			label: 'Switch Aux 2',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchaux2',
					default: '0',
					choices: this.model.aux2
				}
			]
		};
	}
	if (this.config.modelID == 'se3200') {
		actions['switch_aux3'] = {
			label: 'Switch Aux 3',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchaux3',
					default: '0',
					choices: this.model.aux3
				}
			]
		};
	}
	if (this.config.modelID == 'se3200') {
		actions['switch_aux4'] = {
			label: 'Switch Aux 4',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchaux4',
					default: '0',
					choices: this.model.aux4
				}
			]
		};
	}

	actions['switch_hdmi1'] = {
		label: 'Switch HDMI 1 Output',
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'switchhdmi1',
				default: '1',
				choices: this.model.hdmi1
			}
		]
	};



	if (this.config.modelID == 'se3200') {
		actions['switch_hdmi2'] = {
			label: 'Switch HDMI 2 Output',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchhdmi2',
					default: '1',
					choices: this.model.hdmi2
				}
			]
		};
	}
	if (this.config.modelID == 'se3200') {
		actions['switch_hdmi3'] = {
			label: 'Switch HDMI 3 Output',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchhdmi3',
					default: '1',
					choices: this.model.hdmi3
				}
			]
		};
	}
	if (this.config.modelID != 'se2200') {
		actions['switch_sdi1'] = {
			label: 'Switch SDI 1 Output',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchsdi1',
					default: '1',
					choices: this.model.sdi1
				}
			]
		};
	}
	if (this.config.modelID != 'se650' && this.config.modelID != 'se2200') {
		actions['switch_sdi2'] = {
			label: 'Switch SDI 2 Output',
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'switchsdi2',
					default: '1',
					choices: this.model.sdi2
				}
			]
		};
	}

	actions['ftb'] = {
		label: 'Fade to Black',
		options: [
			{
				type: 'dropdown',
				label: 'Action',
				id: 'ftb',
				default: '0',
				choices: this.model.ftb
			}
		]
	};



	if (this.config.modelID == 'se3200' || this.config.modelID == 'se2200') {
		actions['logo'] = {
			label: 'Logo Controls',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'logo',
					default: '0',
					choices: this.model.logo
				}
			]
		};
	}
	if (this.config.modelID == 'se1200mu' || this.config.modelID == 'se3200' || this.config.modelID == 'se700') {
		actions['audio'] = {
			label: 'Audio Controls',
			options: [
				{
					type: 'dropdown',
					label: 'Select',
					id: 'audio',
					default: '8',
					choices: this.model.audio
				}
			]
		};
	}
	if (this.config.modelID == 'se1200mu' || this.config.modelID == 'se3200' || this.config.modelID == 'se700') {
		actions['audio_level'] = {
			label: 'Audio Level Controls',
			options: [
				{
					type: 'dropdown',
					label: 'Select',
					id: 'audio_level',
					choices: this.model.audio_level
				}
			]
		};
	}
	if (this.config.modelID != 'se650' && this.config.modelID != 'se700') {
		actions['audio_src'] = {
			label: 'Select Audio Source',
			options: [
				{
					type: 'dropdown',
					label: 'Select',
					id: 'audio_src',
					default: '0',
					choices: this.model.audio_src
				}
			]
		};
	}
	if (this.config.modelID != 'se2200') {
		actions['loaduser'] = {
			label: 'Load User',
			options: [
				{
					type: 'number',
					label: 'User 1-999',
					id: 'userid',
					min: 1,
					max: 999,
					default: '1'
				}
			]
		};
		actions['saveuser'] = {
			label: 'Save User',
			options: [
				{
					type: 'number',
					label: 'User 1-999',
					id: 'userid',
					min: 1,
					max: 999,
					default: '1'
				}
			]
		};
	}
	if (this.config.modelID != 'se2200') {
		actions['trans_durations'] = {
			label: 'Transition Duration',
			options: [
				{
					type: 'dropdown',
					label: 'Select',
					id: 'trans',
					default: '3',
					choices: [
						{ id: '3', label: 'ME Duration' },
						{ id: '8', label: 'DSK Duration' },
						{ id: '13', label: 'FTB Duration' },
					]
				},
				{
					type: 'number',
					label: 'Frames',
					id: 'frames',
					default: '10'
				}
			]
		};
	}
	if (this.config.modelID != 'se700' && this.config.modelID != 'se650' && this.config.modelID != 'se2200') {
		actions['streamer'] = {
			label: 'Streamer Options',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'streamer',
					default: '0',
					choices: this.model.streamer
				}
			]
		};
	}
	if (this.config.modelID != 'se2200') {
		actions['set_input_name'] = {
			label: 'Set Input Name',
			options: [

				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: '1',
					choices: this.model.inputs
				},
				{
					type: 'textinput',
					label: 'Name',
					id: 'name',
				}
			]
		};
	}

	if (!this.legacy_dvip) {
		actions['set_bus_matte'] = {
			label: 'Set Bus Matte Color',
			options: [
				{
					type: 'colorpicker',
					label: 'RGB color',
					id: 'rgb',
					default: this.rgb(255, 0, 0),
				},
			]
		};
	}

	if (!this.legacy_dvip) {
		actions['set_standard'] = {
			label: 'Set System Standard',
			options: [
				{
					type: 'dropdown',
					label: 'Format',
					id: 'standard',
					default: '0',
					choices: this.model.standard
				},
			]
		};
	}
	if (this.config.modelID == 'se2200' || this.config.modelID == 'se3200' || this.config.modelID == 'se700'|| this.config.modelID == 'se650') {
		actions['menu'] = {
			label: 'Menu Controls',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'menu',
					default: '0',
					choices: this.model.menu
				}
			]
		};
	}

	if (this.config.modelID == 'se2200') {
		actions['crosspoint'] = {
			label: 'Crosspoint Controls',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'crosspoint',
					default: '0',
					choices: this.model.crosspoint
				}
			]
		};

		actions['timer'] = {
			label: 'Timer Controls',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'timer',
					default: '0',
					choices: this.model.timer
				}
			]
		};

		actions['func'] = {
			label: 'Function Buttons',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'func',
					default: '0',
					choices: this.model.func
				}
			]
		};
	}

	if (this.config.modelID == 'se3200') {
		actions['se3200_multiview'] = {
			label: 'SE-3200 Multiview Settings',
			options: [
				{
					type: 'number',
					label: 'Multiview Mode',
					id: 'mode',
					default: 0,
				},
				{
					type: 'dropdown',
					label: 'Main 1 Source',
					id: 'main1',
					default: '1',
					choices: this.model.hdmi1
				},
				{
					type: 'dropdown',
					label: 'Main 2 Source',
					id: 'main2',
					default: '2',
					choices: this.model.hdmi1
				},
				{
					type: 'dropdown',
					label: 'Transparent Labels',
					id: 'transparent_labels',
					default: '0',
					choices: [{ id: '0', label: 'Off' }, { id: '1', label: 'On' }]
				},
				{
					type: 'dropdown',
					label: 'Auto Number',
					id: 'auto_num',
					default: '0',
					choices: [{ id: '0', label: 'Off' }, { id: '1', label: 'On' }]
				},
				{
					type: 'dropdown',
					label: 'Label Info',
					id: 'label_info',
					default: '0',
					choices: [{ id: '0', label: 'Off' }, { id: '1', label: 'On' }]
				},
			]
		};

		actions['se3200_flex_sources'] = {
			label: 'SE-3200 Flex Sources',
			options: [
				{
					type: 'dropdown',
					label: 'Background Source',
					id: 'bg',
					default: '1',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'DVE 1 Source',
					id: 'dve1',
					default: '1',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'DVE 2 Source',
					id: 'dve2',
					default: '2',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'DVE 3 Source',
					id: 'dve3',
					default: '3',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'DVE 4 Source',
					id: 'dve4',
					default: '4',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'Foreground Source',
					id: 'fg',
					default: '19',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'Foreground Enable',
					id: 'fg_enable',
					default: '0',
					choices: [{ id: '0', label: 'Off' }, { id: '1', label: 'On' }]
				},
			]
		};

		actions['se3200_flex1_run'] = {
			label: 'SE-3200 Flex 1 Run',
			options: [
				{
					type: 'dropdown',
					label: 'DVE 1 Source',
					id: 'dve1',
					default: '1',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'Foreground Source',
					id: 'fg',
					default: '19',
					choices: this.model.pgm
				},
				{
					type: 'number',
					label: 'Flex1 Position X (float)',
					id: 'pos_x',
					default: 0,
				},
				{
					type: 'number',
					label: 'Flex1 Position Y (float)',
					id: 'pos_y',
					default: 0,
				},
				{
					type: 'number',
					label: 'Flex1 Size X (float)',
					id: 'size_x',
					default: 0.5,
				},
				{
					type: 'number',
					label: 'Flex1 Size Y (float)',
					id: 'size_y',
					default: 0.5,
				},
			]
		};

		actions['se3200_flex2_run'] = {
			label: 'SE-3200 Flex 2 Run',
			options: [
				{
					type: 'dropdown',
					label: 'DVE 2 Source',
					id: 'dve2',
					default: '2',
					choices: this.model.pgm
				},
				{
					type: 'dropdown',
					label: 'Foreground Source',
					id: 'fg',
					default: '19',
					choices: this.model.pgm
				},
				{
					type: 'number',
					label: 'Flex2 Position X (float)',
					id: 'pos_x',
					default: 0,
				},
				{
					type: 'number',
					label: 'Flex2 Position Y (float)',
					id: 'pos_y',
					default: 0,
				},
				{
					type: 'number',
					label: 'Flex2 Size X (float)',
					id: 'size_x',
					default: 0.5,
				},
				{
					type: 'number',
					label: 'Flex2 Size Y (float)',
					id: 'size_y',
					default: 0.5,
				},
			]
		};

		actions['dvcc_merge_run_named'] = {
			label: 'DV Control Center: Run Merge Key by Name',
			options: [
				{
					type: 'textinput',
					label: 'Key Name (e.g. Key1, studio+cam)',
					id: 'key_name',
					default: 'Key1',
				},
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'flex',
					choices: [
						{ id: 'flex', label: 'Flex' },
						{ id: 'pip', label: 'P-in-P' },
					]
				},
				{
					type: 'dropdown',
					label: 'HTTP Method',
					id: 'http_method',
					default: 'POST',
					choices: [
						{ id: 'POST', label: 'POST' },
						{ id: 'GET', label: 'GET' },
					]
				},
			]
		};
		actions['se3200_flex_stop'] = {
			label: 'SE-3200 Flex Stop',
			options: []
		};

		actions['se3200_pip_window'] = {
			label: 'SE-3200 PiP Window',
			options: [
				{
					type: 'dropdown',
					label: 'Window',
					id: 'window',
					default: '1',
					choices: [
						{ id: '1', label: 'PiP 1' },
						{ id: '2', label: 'PiP 2' },
						{ id: '3', label: 'PiP 3' },
						{ id: '4', label: 'PiP 4' },
					]
				},
				{
					type: 'dropdown',
					label: 'Enable',
					id: 'enable',
					default: '1',
					choices: [{ id: '0', label: 'Off' }, { id: '1', label: 'On' }]
				},
				{
					type: 'number',
					label: 'Position X (float)',
					id: 'pos_x',
					default: 0,
				},
				{
					type: 'number',
					label: 'Position Y (float)',
					id: 'pos_y',
					default: 0,
				},
				{
					type: 'number',
					label: 'Size X (float)',
					id: 'size_x',
					default: 0.5,
				},
				{
					type: 'number',
					label: 'Size Y (float)',
					id: 'size_y',
					default: 0.5,
				},
				{
					type: 'number',
					label: 'Crop/Edge Left (float)',
					id: 'edge_left',
					default: 0,
				},
				{
					type: 'number',
					label: 'Crop/Edge Right (float)',
					id: 'edge_right',
					default: 0,
				},
				{
					type: 'number',
					label: 'Crop/Edge Top (float)',
					id: 'edge_top',
					default: 0,
				},
				{
					type: 'number',
					label: 'Crop/Edge Bottom (float)',
					id: 'edge_bottom',
					default: 0,
				},
			]
		};

		actions['se3200_set_control_label'] = {
			label: 'SE-3200 Set Control by Label',
			options: [
				{
					type: 'textinput',
					label: 'Control Label (e.g. SWITCHER_FLEX_SRC_DVE1_SRC)',
					id: 'label',
					default: 'SWITCHER_FLEX_SRC_DVE1_SRC',
				},
				{
					type: 'dropdown',
					label: 'Value Type',
					id: 'value_type',
					default: 'auto',
					choices: [
						{ id: 'auto', label: 'Auto (from protocol)' },
						{ id: 'int', label: 'Integer' },
						{ id: 'float', label: 'Float' },
						{ id: 'flag', label: 'Flag (0/1)' },
					]
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					default: '1',
				},
			]
		};

		actions['se3200_set_control_raw'] = {
			label: 'SE-3200 Set Control by Section/ID',
			options: [
				{
					type: 'number',
					label: 'Section ID',
					id: 'section_id',
					default: 2,
				},
				{
					type: 'number',
					label: 'Sub Section ID (for SECTION_SWITCHER only)',
					id: 'sub_section_id',
					default: 0,
				},
				{
					type: 'number',
					label: 'Control ID',
					id: 'control_id',
					default: 198,
				},
				{
					type: 'dropdown',
					label: 'Value Type',
					id: 'value_type',
					default: 'int',
					choices: [
						{ id: 'int', label: 'Integer' },
						{ id: 'float', label: 'Float' },
						{ id: 'flag', label: 'Flag (0/1)' },
					]
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					default: '1',
				},
			]
		};
	}

	actions['send_hex'] = {
		label: 'Send Hex Value',
		options: [
			{
				type: 'textinput',
				label: 'Hex Input',
				id: 'hex',
				default: '0',
			}
		]
	};

	return actions
}


