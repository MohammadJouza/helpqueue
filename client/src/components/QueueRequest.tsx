import React, { useEffect, useState } from "react";
// @ts-ignore
import Rate from "rc-rate";
import "rc-rate/assets/index.css";
import {
  Container,
  Button,
  Input,
  Card,
  CardBody,
  CardTitle,
  Label,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  Row,
  Col,
  Alert
} from "reactstrap";
import useLogin from "../hooks/useLogin";
import ServerHelper, { ServerURL } from "./ServerHelper";
import useViewer from "../hooks/useViewer";
import { Ticket, User } from "./Types";
import createAlert, { AlertType } from "./Alert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

const QueueRequest = () => {
  const { getCredentials, logout } = useLogin();
  const { settings } = useViewer();
  const { isLoggedIn } = useViewer();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [rankings, setRankings] = useState([]);
  const [queueLength, setQueueLength] = useState(0);
  const [cTicketQuestion, setCTicketQuestion] = useState("");
  const [cTicketLocation, setCTicketLocation] = useState("");
  const [cTicketContact, setCTicketContact] = useState("");
  const [cTicketRating, setCTicketRating] = useState(0);
  const getTicket = async () => {
    const res = await ServerHelper.post(ServerURL.userTicket, getCredentials());
    if (res.success) {
      setTicket(res.ticket);
      setUser(res.user);
      setQueueLength(res.queue_position + 1);
      setRankings(res.rankings);
    } else {
      setTicket(null);
      if (isLoggedIn) {
        if(window.confirm("Your credentials appear to be invalid... Do you want to log out and try again?")) {
          logout();
        }
      }
    }
  };
  const cancelTicket = async () => {
    if (ticket == null) {
      return;
    }
    const res = await ServerHelper.post(ServerURL.cancelTicket, {
      ...getCredentials(),
      ticket_id: ticket.id
    });
    if (res.success) {
      setTicket(null);
      setCTicketQuestion(ticket.data.question);
      createAlert(AlertType.Success, "Canceled ticket");
    } else {
      createAlert(AlertType.Error, "Could not cancel ticket");
    }
  };
  const rateTicket = async () => {
    if (ticket == null) {
      return;
    }
    const res = await ServerHelper.post(ServerURL.rateTicket, {
      ...getCredentials(),
      ticket_id: ticket.id,
      rating: cTicketRating
    });
    if (res.success) {
      setTicket(null);
      createAlert(AlertType.Success, "Successfully rated ticket");
    } else {
      createAlert(AlertType.Error, "Could not rate ticket");
    }
  };
  useEffect(() => {
    // On load check to see what the status is of the ticket
    getTicket();

    const interval = setInterval(getTicket, 5000);
    return () => clearInterval(interval);
  }, []);
  if (!isLoggedIn) {
    window.location.href = "/login";
    return null;
  }
  let queueCard = null;
  if (ticket == null) {
    queueCard = (
      <>
        <CardTitle>
          <h2>How can we help you?</h2>
        </CardTitle>
        <Label style={{ display: "block" }}>
          What's your problem?
          <Input
            type="textarea"
            placeholder="describe your problem"
            value={cTicketQuestion}
            onChange={e => setCTicketQuestion(e.target.value)}
          />
        </Label>
        <br />
        <InputGroup>
          <InputGroupAddon addonType="prepend">
            <InputGroupText>you can find me at</InputGroupText>
          </InputGroupAddon>
          <Input
            placeholder="where are you?"
            value={cTicketLocation}
            onChange={e => setCTicketLocation(e.target.value)}
          />
        </InputGroup>
        <InputGroup>
          <InputGroupAddon addonType="prepend">
            <InputGroupText>you can reach me at</InputGroupText>
          </InputGroupAddon>
          <Input
            placeholder="additional contact info i.e. cell/email"
            value={cTicketContact}
            onChange={e => setCTicketContact(e.target.value)}
          />
        </InputGroup>
        <br />
        <Button
          onClick={async () => {
            if (cTicketQuestion.length === 0) {
              createAlert(AlertType.Warning, "You need to ask a question!");
              return;
            }
            if (cTicketLocation.length === 0) {
              createAlert(
                AlertType.Warning,
                "Please provide a location so a mentor can find you!"
              );
              return;
            }
            setCTicketRating(0);
            const res = await ServerHelper.post(ServerURL.createTicket, {
              ...getCredentials(),
              data: JSON.stringify({
                question: cTicketQuestion,
                location: cTicketLocation,
                contact: cTicketContact.length === 0 ? "N/A" : cTicketContact
              })
            });
            if (res.success) {
              setTicket(res.ticket);
              setCTicketQuestion("");
            }
          }}
          color="primary"
          className="col-12"
        >
          Create Ticket
        </Button>
      </>
    );
  } else if (ticket.status == 0 || ticket.status == 2) {
    // Unclaimed
    queueCard = (
      <>
        <CardTitle>
          <h2>Waiting for Mentor...</h2>
        </CardTitle>
        <p>
          <b>Position in Queue:</b> {queueLength}
          <br />
          <b>Posted:</b>{" "}
          {ticket.minutes < 3
            ? "few minutes ago"
            : ticket.minutes + " minutes ago"}
        </p>
        <p>
          <b>Question:</b> {ticket.data.question}
          <br />
          <b>Location:</b> {ticket.data.location}
          <br />
          <b>Contact:</b> {ticket.data.contact}
        </p>
        <Button onClick={cancelTicket} className="col-12" color="danger">
          Cancel Ticket
        </Button>
      </>
    );
  } else if (ticket.status == 1) {
    // Claimed
    queueCard = (
      <>
        <CardTitle>
          <h2>You have been claimed!</h2>
        </CardTitle>
        <p><b>Claimed by:</b> {ticket.claimed_by} </p>
        <Button onClick={cancelTicket} className="col-12" color="danger">
          Cancel Ticket
        </Button>
      </>
    );
  } else if (ticket.status == 3) {
    // Closed but not yet rated
    queueCard = (
      <>
        <p> The ticket has been closed. </p>
        <p> Please rate your mentor (<b>{ticket.claimed_by}</b>)!</p>
        <Rate
          defaultValue={0}
          onChange={setCTicketRating}
          style={{ fontSize: 40 }}
          allowClear={true}
        />
        <Button onClick={rateTicket} className="col-12 mt-5" color="success">
          {cTicketRating == 0 ? (
            "Close Ticket"
          ) : (
            <>
              Rating <b>{ticket.claimed_by}</b> {cTicketRating} stars
            </>
          )}
        </Button>
      </>
    );
  } else {
    queueCard = <p> Something went wrong </p>;
  }
  return (
    <Container>
      {settings && settings.queue_message.length > 0 ? (
        <Row>
          <Col sm="12">
            <Alert color="secondary">{settings.queue_message}</Alert>
          </Col>
        </Row>
      ) : null}
      <Row>
        <Col lg={rankings.length > 0 ? "8" : "12"}>
          <Card>
            <CardBody>
              {user && user.admin_is ? (
                <Button href="/admin" color="info" className="col-6 mb-5">
                  Admin Page
                </Button>
              ) : null}
              {user && user.mentor_is ? (
                <Button href="/m" color="success" className="col-6 mb-5">
                  Mentor Queue
                </Button>
              ) : null}
              {settings && settings.queue_status == "true"
                ? queueCard
                : "The queue is currently closed"}
            </CardBody>
          </Card>
        </Col>
        {rankings.length > 0 ? (
          <Col lg="4">
            <Card>
              <CardBody>
                <CardTitle>
                  <h3>Mentor Leaderboard</h3>
                </CardTitle>
                <ol>
                  {rankings.map(
                    (
                      r: { name: string; rating: string; tickets: string },
                      ind
                    ) => {
                      return (
                        <li key={r.name}>
                          {r.name} - {r.rating}{" "}
                          <FontAwesomeIcon icon={faStar} color="gold" /> (
                          {r.tickets} {r.tickets == "1" ? "ticket" : "tickets"})
                        </li>
                      );
                    }
                  )}
                </ol>
              </CardBody>
            </Card>
          </Col>
        ) : null}
      </Row>
    </Container>
  );
};

export default QueueRequest;
