<?php
class User extends CI_Controller {
	public function __construct()
	{
		parent::__construct();
		$this->load->library('form_validation');
		$this->load->model('user_model');
		$this->load->helper('url');
	}
	function login(){
 		  $rule=array(                        //登录表单的规则
             array(
                 'field'=>'username',
                 'label'=>'User name',
                 'rules'=>'trim|required|xss_clean|callback_username_check'
             ),array(
                 'field'=>'password',
                 'label'=>'Password',
                 'rules'=>'trim|required|xss_clean|md5|callback_password_check'
             ));
         $this->form_validation->set_rules($rule);
         $this->_username = $this->input->post('username');                //用户名
         if ($this->form_validation->run() == FALSE){
             $this->load->view('account/login');
         } else {
             //注册session,设定登录状态
         	 $userinfo=$this->user_model->get_by_username($this->_username);
             $this->user_model->login($userinfo);
             $data['message'] = 'Welcome back, '.$this->session->userdata('username').'!';
             redirect('admin/dashboard');
         }
        
     }
     function username_check($username){
         if ($this->user_model->get_by_username($username)){
             return TRUE;
         }else{
             $this->form_validation->set_message('username_check', 'User name not exist.');
             return FALSE;
         }
     }
     function password_check($password) {
         $password = md5($password);
         if ($this->user_model->password_check($this->_username, $password)){
             return TRUE;
         }else{
             $this->form_validation->set_message('password_check', 'Incorrect username or paswsword.');
             return FALSE;
         }
      }
     /**
      * 用户注册
      * 表单规则在配置文件:/config/form_validation.php
      * 错误提示信息在文件：/system/language/english/form_validation.php
      */
     function register(){
     	    $rule=array(                    //用户注册表单的规则
             array(
                 'field'=>'username',
                 'label'=>'User name',
                 'rules'=>'trim|required|xss_clean|callback_username_exists'
             ),
             array(
                 'field'=>'password',
                 'label'=>'Paassword',
                 'rules'=>'trim|required|min_length[4]|max_length[12]|matches[passwordconf]|md5|xss_clean'
             ),
             array(
                 'field'=>'email',
                 'label'=>'E-mail address',
                 'rules'=>'trim|required|xss_clean|valid_email|callback_email_exists'
             )
         );
     	 $this->form_validation->set_rules($rule);
         //设置错误定界符
         $this->form_validation->set_error_delimiters('<span class="error">', '</span>');
         
         if ($this->form_validation->run() == FALSE) {
             $this->load->view('account/register');
         }else{
             $username = $this->input->post('username');
             $password = md5($this->input->post('password'));
             $email = $this->input->post('email');
             $display_name = $this->input->post('display_name');
             if ($this->user_model->add_user($username, $password, $email, $display_name)){
                 $data['message'] = "The user account has now been created! You can go "
                             .anchor('account/index', 'here').'.';
             }else{
                 $data['message'] = "There was a problem when adding your account. You can register "
                             .anchor('account/register', 'here').' again.';
             }
             $this->load->view('account/note', $data);
         };        
        }
     /**
      * ======================================
      * 用于注册表单验证的函数
      * 1、username_exists()
      * 2、email_exists()
      * ======================================
      */
     /**
      * 验证用户名是否被占用。
      * 存在返回false, 否者返回true.
      * @param string $username
      * @return boolean
      */
     function username_exists($username){
         if ($this->user_model->get_by_username($username)){
             $this->form_validation->set_message('username_exists', 'User name is not available.');
             return FALSE;
         }
         return TRUE;
     }
     function email_exists($email){
         if ($this->user_model->email_exists($email)){
             $this->form_validation->set_message('email_exists', 'E-mail is not available.');
             return FALSE;
         }
         return TRUE;
     }
     function logout(){
         if ($this->user_model->logout() == TRUE){
         	 $data['message']='Log out successfully!';
             $this->load->view('account/login',$data);
         }else{
         	 redirect('/', 'refresh');
         }
     }
}