
Translate.language["zh"] = new Polyglot({locale:"zh"});
Translate.language["zh"].extend({
	drop_down_display: '中文'
});
Translate.language["zh"].extend({
	alert: {
		noUserSet: "需要先设置身份!",
        flag: '警告：这样将会立即将此puff在你的浏览器和网络里移除，一旦操作将不可恢复！'
	},
	menu: {
		view: {
			title: '查看',
			roots: '话题',
			latest: '最新',
			collection: '收藏',
			shortcut: '快捷键',
			show_mine: '我的puff',
            show_puffs:'收件箱'
		},
		filters: {
			title: '筛选',
			by: '根据',
			tags: '标签',
			routes: '路径',
			users: '用户名'
		},
		preferences: {
			title: '设置',
			relationship: "显示关联",
			animation: "显示动画",
			infobar: "显示信息栏",
			disable_reporting: "停止上传使用信息",
			language: "语言"
		},
		publish: {
			title: '发布',
			new_puff: "新建"
		},
		identity: {
			title: '身份',
			current: '当前身份',
			none: '无',
			username: '用户名',
			private: '密钥',
			public: '公钥',
			default: '默认',
			admin: '管理',
			root: '总管',
			new_identity: {
				title: '新建身份',
				msg: '新用户名',
				generate: '建立',
				or: '或',
				error_missing: '在提交之前必须设定好所有的公钥！',
				success: '成功!',
				submit: '提交',
				import_content: '导入内容'
			},
			editIdentity: {
				title: '查看身份',
				msg: '已储存的用户密钥'
			},
			set_identity: {
				title: '设定身份',
				msg: '将密匙储存在当前浏览器里。若想发布信息只需要设置默认密钥。'
			},
            step: {
                title:'第%{n}步',
                next: '下一步',
                back: '上一步',
                select:'选择一个新用户名 ',
                import:'或者，从这里引入 ',
                generate:'为%{username}生成密匙 ',
                remember:'记得保存密匙！',
                request:'申请用户名 '
            }
		},
		about: {
			title: '关于',
			introduction: '介绍',
			faq: "常见问题",
			code: '源码'
		},
		tools: {
			title: '高级工具',
			builder: "生成",
			clear_cache: '清除已缓存的puff'
		},
        tooltip:{
            roots:'显示最新的根puff',
            latest:'显示最新的puff',
            collection:'显示特别收藏',
            shortcut:'查看本站的所有快捷鍵',
            showPuffs:'显示发送给我的puff',
            show_mine: '显示我发送的puff',
            relationship:'显示/隐藏puff之间的关联',
            animation:'启用/禁止动画',
            infobar:'显示/隐藏所有puff的信息栏',
            set_identity: '贮存密钥',
            editIdentity: '查看当前密钥',
            new_identity: '创建新身份',
            new_puff:'发布一个新的puff',
            generate: '随机生成一个新用户名',
            code:'在GitHub查看源代码',
            puff_builder:'显示puff生成器',
            tags_filter: '显示有此标记的puff',
            routes_filter: '显示此路径的puff',
            routeErase: '取消选择本路径',
            users_filter: '显示此用户的所有puff',
            userErase: '取消选择本用户名',
            current_delete:'在本浏览器中删除此用户',
            view_image: '显示大图',
            parent:'显示本puff的上级',
            children:'显示本puff的下级',
            reply:'回复本puff',
            see_more:'显示更多选项',
            view_raw:'显示未加工前的代码',
            json:'显示本puff的JSON代码',
            permalink:'本puff的文本链接',
            flag_link: '标记为移除。如果你生成了这个puff，这将发送移除申请。',
            expand: '扩大puff以单行显示',
            compress: '将puff缩回默认大小',
            copy:'将此puff加工前的内容拷贝到回复框',
            disable_reporting: "我们追踪您对本网站的使用。选中禁止追踪。"
        }
	},
	header: {
		tooltip: {
            publish: '发送新puff',
            identity: '账户管理',
            icon: '显示/隐藏目录',
            refresh: '更新'
		}
	},
	replyForm: {
		recipient: '收件人',
        send_to: '发送给',
        send_to_ph: '所有人',
		text_area_ph: '在此添加内容。 若回复其他puff请选择回复。',
		send: '发送',
		preview_text: '预览',
		content_text: '内容',
		type_text: '类',
		format: {
			text: '文字',
			image: '图片',
			bb_code_msg: '你可以使用BBCode格式的标签',
			image_file: '图片文件',
			image_chosen: '没有选中文件',
			content_license: '内容许可'
		},
        privacy_option: '隐私',
        p_options: {
            public: '公开 (所有人可见)',
            private: '私密 (内容是加密的)',
            anonymous: '匿名 (加密及匿名的)',
            paranoid: '警惕 (每次都会重新生成用户名)'
        },
        advanced: {
        	title: '高级选项',
			content_license: '内容许可',
			reply_privacy: '回复隐私'
        }
	},
	footer: {
		powered: '技术支持',
		rest: '本站所有内容的责任在于作者。本站不对任何发布的内容负责。'
	}
});
Translate.language["zh"].extend({
	puff: {
		default: 'AN1rKp8pNT4HSMwCW7nnL3YWHDeWbgAEsyrsPkQAorwVSFANkBDxzhTyPHjSEppCeRXsjK87RuEzjrTHyCFkYFTu8dAoY66BC',
		shortcut: 'iKx1CJMRR5t3i8gJDkL6JLM3AEqKSDfLuek3XoD4TupbkPCvRLpnH7gkscU8LGd2yCyKJZEqEGpUao3BJM3wQdwR2bRC992LmC'
	}
})

