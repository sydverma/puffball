var UsernameImport = {};
UsernameImport.update = function(loaded, created, total) {
	document.getElementById("import_content").innerHTML =
			"Start import content...<br>" 
			+ "Loaded: " + loaded + "/" + total + "<br>Created: " 
			+ created + "/" + total + "<br>";
}

UsernameImport['instagram'] = {
	'client_id': 'a62caaef5b6047d68445bb91653e585b',
	'redirect_uri': 'http://www.everybit.com/r/ig'
};
UsernameImport.instagram.requestAuthentication = function() {
	var auth_url = 'https://api.instagram.com/oauth/authorize/?client_id=' + this.client_id + '&redirect_uri=' + this.redirect_uri + '&response_type=code';
	window.location = auth_url;
};
UsernameImport.instagram.contentURL = function(username, userid, access_token) {
	var content_url = "https://api.instagram.com/v1/users/" + userid + "/media/recent/?access_token=" + access_token + "&count=100&callback=UsernameImport.instagram.collectData";
	username = StringConversion.toActualUsername(username);
		console.log(username);
	if (PB.switchIdentityTo(username)) {
		var newScript_el = document.createElement('script');
		newScript_el.setAttribute("src", content_url);
		newScript_el.setAttribute("class", "instagramContent");
		try {
			this.allResult = [];
			document.getElementsByTagName('head')[0].appendChild(newScript_el);
		} catch (err) {
			throw err;
		}
	} else {
		throw Error("Need keys for this identity to import.")
	}
}
UsernameImport.instagram.collectData = function(result) {
	if (result.meta.code == 200) {
		var data = result.data.filter(function(d){return d.type == "image"});
		var nextPage = result.pagination['next_url'];
		this.allResult = this.allResult.concat(data);
		if (nextPage && nextPage.length > 0) {
			var newScript_el = document.createElement('script');
			newScript_el.setAttribute("src", nextPage+'&callback=UsernameImport.instagram.collectData');
			newScript_el.setAttribute("class", "instagramContent");
			document.getElementsByTagName('head')[0].appendChild(newScript_el);
		} else {
			this.importAllContent();
		}
	} else {
		document.getElementById("import_content").innerHTML = "HTTP status code: " + result.meta.code;
		console.log(result.meta);
	}
}
UsernameImport.instagram.importAllContent = function() {
	var contents = this.allResult;
	var loadedCount = 0;
	var createdCount = 0;
	var total = Math.min(contents.length, 100);
	UsernameImport.update(loadedCount, createdCount, total);
	for (var i=0; i<total; i++) {
		var entry = contents[i];

		var img_el = document.createElement("img");
		img_el.crossOrigin = '';
		var src = entry.images['standard_resolution']['url'];
		src = "http://162.219.162.56:8080/" + src.split('/').slice(2).join('/');
		var width  = entry.images['standard_resolution']['width'];
		var height = entry.images['standard_resolution']['height'];
		img_el.setAttribute('src', src);
		img_el.setAttribute('data-index', i)
		img_el.setAttribute('width', width);
		img_el.setAttribute('height', height);
		img_el.onerror = function(err) {
			throw Error("Error loading image");
		}
		img_el.onload = function(){
			var entry = contents[this.attributes['data-index'].value];
			loadedCount++;
			UsernameImport.update(loadedCount, createdCount, total);
			var img_el = this;
		    var canvas = document.createElement("canvas");
		    canvas.height = img_el.width;
		    canvas.width = img_el.height;

		    var ctx = canvas.getContext("2d");
			ctx.drawImage(img_el, 0, 0);
			var img = canvas.toDataURL('image/jpeg');

			var metadata = {
				time: entry.created_time * 1000,
				tags: entry.tags
			}
			if (entry.caption)
				metadata.caption = entry.caption.text;
			var post_prom = PB.M.Forum.addPost('image', img, [], metadata);
			post_prom.then(function(puff){
				createdCount++;
				UsernameImport.update(loadedCount, createdCount, total);
				// if all are created, redirect all contents published by this user
				if (createdCount == total) {
					document.getElementById("import_content").innerHTML = "Import finished.<br>";
					var username = PB.getCurrentUsername();
					Events.pub("ui/show-imported-puff", {'view.mode': 'list',
														 'view.filters': {},  
														 'view.filters.users': [username]});

					// clean up
					var head = document.getElementsByTagName("head")[0];
					var contentScript = head.getElementsByClassName("instagramContent");
					for (var i=0; i<contentScript.length; i++) {
						head.removeChild(contentScript[i]);
					}
				}
			}).catch(function(err){
				console.log(err.message);
			})
		};
	}
}


UsernameImport['reddit'] = {
	'client_id': '1qm_OqK_sUCRrA',
	'redirect_uri': 'http://www.everybit.com/r/reddit/'
};
UsernameImport.reddit.requestAuthentication = function() {
	var state = ''; // a random string that can use later for verification
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	for (var i=0; i<10; i++) {
    var item = PB.Crypto.getRandomItem(possible)
		state += possible[index];
	}

	var auth_url = 'https://ssl.reddit.com/api/v1/authorize?client_id=' + UsernameImport.reddit.client_id + '&response_type=code&state=' + state + '&redirect_uri=' + UsernameImport.reddit.redirect_uri + '&duration=temporary&scope=identity';
	window.location = auth_url;
};
