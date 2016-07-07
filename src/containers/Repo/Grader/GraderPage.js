import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Helmet from 'react-helmet';
import { OutputContainer, GraderForm, SSHLoginForm } from 'components';
import { isLoaded, load, save, submit, update, destroy } from 'redux/modules/grade';
import { asyncConnect } from 'redux-async-connect';
import { Modal, OverlayTrigger, Tooltip, Button } from 'react-bootstrap';


@asyncConnect([{
  promise: (options) => {
    const { store: { dispatch, getState }, params: { repoId, assignmentId, graderId } } = options;

    if (!isLoaded(getState(), repoId, assignmentId)) {
      return dispatch(load(repoId, assignmentId, graderId));
    }
  }
}])
@connect(
  state => ({
    repo: state.repo.repo,
    students: state.grade.students,
    error: state.grade.error,
    submitting: state.grade.submitting,
    submission: state.grade.submission
  }), {
    save,
    submit,
    destroy,
    update
  }
)
export default class GraderPage extends Component {
  static propTypes = {
    params: PropTypes.object.isRequired,
    students: PropTypes.array,
    repo: PropTypes.object,
    save: PropTypes.func.isRequired,
    submit: PropTypes.func.isRequired,
    error: PropTypes.object,
    update: PropTypes.func.isRequired,
    destroy: PropTypes.func.isRequired,
    submitting: PropTypes.bool,
    submission: PropTypes.object
  };

  constructor(props) {
    super(props);

    const { students } = props;
    this.state = {
      showModal: false,
      currentStudent: students && students.length ? students[0] : null,
      studentIndex: 0,
      showOutput: true
    };
  }

  componentWillUnmount() {
    this.props.destroy();
  }


  getEmailTooltip() {
    return (<Tooltip id="bbcEmail">
      This is the email that should be BCC for a copy. (Hidden from the student)
    </Tooltip>);
  }

  getVerificationTooltip() {
    return (<Tooltip id="verificationTooltip">
      This will email only you and Susan for her to verify grades first.
    </Tooltip>);
  }

  open = () => {
    this.setState({ showModal: true });
  }

  close = () => {
    this.setState({ showModal: false });
  }

  handleChange = (event) => {
    event.preventDefault();

    const { students } = this.props;
    const studentIndex = +this.refs.student.value;

    this.setState({
      currentStudent: students[studentIndex],
      studentIndex
    });
  }

  handleSave = (grade, comment) => {
    const { assignmentId, repoId } = this.props.params;
    const { currentStudent, studentIndex } = this.state;

    this.props.save({
      assignment: assignmentId,
      repo: repoId,
      studentId: currentStudent.studentId,
      grade: grade,
      comment: comment
    });

    this.props.update(studentIndex, {
      ...currentStudent,
      grade: grade,
      comment: comment
    });
  }

  handleClick = () => {
    this.setState({
      showOutput: !this.state.showOutput
    });
  }

  handleSubmit = () => {
    const bbcEmail = this.refs.bbcEmail.value;
    if (!bbcEmail) {
      alert('Please add an email to bcc to get a copy');
    } else if (confirm('Are you sure you want to email the students and Susan these grades?')) {
      const { assignmentId, repoId, graderId } = this.props.params;

      this.props.submit({
        bbcEmail,
        assignmentId,
        graderId,
        repoId
      });
      this.setState({ showModal: true });
    }
  }

  handleVerification = () => {
    const bbcEmail = this.refs.bbcEmail.value;
    if (!bbcEmail) {
      alert('Please add an email to bcc to get a copy');
    } else if (confirm('Are you sure you want to email Susan these grades for verification?')) {
      const { assignmentId, repoId, graderId } = this.props.params;

      this.props.submit({
        verification: true,
        bbcEmail,
        assignmentId,
        graderId,
        repoId
      });
      this.setState({ showModal: true });
    }
  }

  render() {
    const { assignmentId, repoId, graderId } = this.props.params;
    const { currentStudent, showModal, showOutput } = this.state;
    const { error, repo, students, submitting } = this.props;

    // Determine if we should show the student's code or output
    const fileName = currentStudent && currentStudent.studentId + (showOutput ? '.out.html' : '.txt');

    return (
      <div>
        <Helmet title={ assignmentId }/>
        <div className="container">
          {
            error &&
            <h1 className="alert alert-danger">
              Error: { error.message }
            </h1> ||
            // TODO: Need to add 404 page here if there is no currentStudent
            repo && repo.username === repoId &&
            <div className="row">
              <div className="col-lg-7">
                <div className="row">
                  <div className="col-lg-12">
                    <OutputContainer
                      viewHeight="35"
                      multireducerKey="correctOutput"
                      assignmentId={ assignmentId }
                      graderId={ graderId }
                      fileName="output.txt"
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-12">
                    <OutputContainer
                      viewHeight="35"
                      multireducerKey="studentOutput"
                      assignmentId={ assignmentId }
                      graderId={ graderId }
                      fileName={ `${ fileName }`}
                    />
                    <button className="btn btn-primary" onClick={ this.handleClick }>
                      { showOutput ? 'Display Code' : 'Display Output'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-lg-5">

                <div className="form-group" style={ { marginTop: '20px' } }>
                  <label>BCC Email:</label>
                  <div className="input-group">
                    <input ref="bbcEmail" type="text" className="form-control"/>
                    <OverlayTrigger placement="bottom" overlay={ this.getEmailTooltip() }>
                      <span className="input-group-addon">
                          <i className="fa fa-question-circle" rel="help"></i>
                      </span>
                    </OverlayTrigger>
                  </div>
                </div>

                <select
                  ref="student"
                  style={ { fontSize: '20px' } }
                  onChange={ this.handleChange }
                >
                  {
                    students.map((student, studentIndex) =>
                      <option key={ student.studentId } value={ studentIndex }>{ student.studentId }</option>
                    )
                  }
                </select>

                <button
                  disabled={ submitting }
                  className="btn btn-primary"
                  onClick={ this.handleSubmit }
                  style={ { margin: '0 10px' } }
                >
                  Submit Grades
                </button>

                <OverlayTrigger placement="bottom" overlay={ this.getVerificationTooltip() }>
                  <button disabled={ submitting }
                    className="btn btn-primary"
                    onClick={ this.handleVerification }
                  >
                    Verify Grades
                  </button>
                </OverlayTrigger>

                <i className={ 'btn fa fa-refresh' + (submitting ? ' fa-pulse disabled' : '') } />

                <Modal show={ showModal } onHide={ this.close }>
                  <Modal.Header closeButton>
                  </Modal.Header>
                  <Modal.Body>
                    Email successfully sent!
                  </Modal.Body>
                  <Modal.Footer>
                    <Button className="btn btn-primary" onClick={this.close}>
                      Close
                    </Button>
                  </Modal.Footer>
                </Modal>

                <GraderForm
                  studentId={ currentStudent.studentId }
                  bonus={ currentStudent.bonus }
                  comment={ currentStudent.comment }
                  grade={ currentStudent.grade }
                  onSave={ this.handleSave }
                />
              </div>
            </div> ||
            <SSHLoginForm repoId={ repoId } />
          }
        </div>
      </div>
    );
  }
}
