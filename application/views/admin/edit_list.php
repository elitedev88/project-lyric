<!doctype html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>Edit Post - <?=$this->admin_model->get_title();?></title>
	<?php $this->load->view('gy/head');?>
</head>
<body>
	<?php $this->load->view('gy/header');?>
	<div class="hero-unit header single-head">
		<div class="container">
			<h2>Dashboard</h2>
		</div>
	</div>
	<div class="container container-fluid">
		<div class="row-fluid">
			<?php $this->load->view('admin/sidebar');?>
			<div class="span10">
				<h1>Edit Post</h1>
				<table class="table table-hover text-left post-list"><tbody>
					<tr>
						<!--<th><input type="checkbox" name="post-all" id="post-all"></th>-->
						<th>ID</th>
						<th>Name</th>
						<th>Lyric</th>
						<th>Author</th>
						<th>Action</th>
					</tr>
					<?php foreach ($posts as $postitem): ?>
					<tr>
						<!--<td class="tick"><input type="checkbox" name="post-<?=$postitem->id?>" id="post-<?=$postitem->id?>"></td>-->
						<td class="id"><?=$postitem->id?></td>
						<td class="name"><?=$postitem->name?></td>
						<td class="lyric"><?=$postitem->lyric?></td>
						<td class="author"><?=$this->user_model->get_by_id($postitem->user_id)->display_name?></td>
						<td class="action">
							<?=anchor('admin/edit/'.$postitem->id, 'Edit', 'class="btn btn-small btn-primary"')?>
							<?='<a href="javascript:void(0)" class="btn btn-danger btn-small" onclick="delConfModal('.$postitem->id.",'".jsize_string($postitem->lyric)."')\">Delete</a>"; ?> 
							<?=anchor('imggen/new/'.$postitem->id, 'ImageGen', 'class="btn btn-small"')?>
						</td>
					</tr>
					<?php endforeach; ?>
				<tbody></table>

			</div>
			
		</div>

	</div>
	<div class="modal hide" id="Del">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal">×</button>
			<h3>Confirm Delete</h3>
		</div>
		<div class="modal-body">
			<p>Are you sure you want to delete the following item?</p>
			<p id="del_info">....</p>
		</div>
		<div class="modal-footer">
			<a href="#" class="btn btn-danger" id="btn-delete">Delete</a>
			<a href="#" data-dismiss="modal" class="btn btn-primary">Cancel</a>
		</div>
	</div>
	<?php $this->load->view('gy/footer');?>
</body>
</html>