// Header-only, modern C++ main-application-class using
// an argument-parser based on ARGP
//
// Copyright (C) 2018-2019 Patrick Boettcher <p@yai.se>
//
// SPDX-License-Identifier: LGPL-3.0
//
// Version: 1.0.0
//
// Project website: https://github.com/pboettch/cxx_argp
#ifndef CXX_ARGP_APPLICATION_H__
#define CXX_ARGP_APPLICATION_H__

#include "cxx_argp_parser.h"

#include <condition_variable>
#include <mutex>

#include <csignal>

namespace cxx_argp
{

class application
{
protected:
	cxx_argp::parser arg_parser;

	application(size_t expected_argument_count = 0)
	    : arg_parser(expected_argument_count)
	{
		std::signal(SIGINT, application::signal_handler);
		std::signal(SIGTERM, application::signal_handler);
	}

	~application()
	{
		std::signal(SIGTERM, SIG_DFL);
		std::signal(SIGINT, SIG_DFL);
	}

	// method to be overridden
	virtual int main() = 0;
	virtual bool check_arguments() { return true; }

	static std::mutex main_event_mutex_;        //< mutex for signal handling
	static std::condition_variable main_event_; //< conditional variable to wakeup the application
	static bool interrupted_;                   //< used by signal handlers

public:
	const cxx_argp::parser &arguments() const { return arg_parser; }

	// call this to start the application
	int operator()(int argc, char *argv[])
	{
		if (!arg_parser.parse(argc, argv))
			return EXIT_FAILURE;

		if (!check_arguments())
			return EXIT_FAILURE;

		return main();
	}

	static void interrupt()
	{
		std::lock_guard<std::mutex> lk__(application::main_event_mutex_);
		application::interrupted_ = true;
		application::main_event_.notify_all();
	}

	static bool interrupted() { return application::interrupted_; }

	static void wait()
	{
		std::unique_lock<std::mutex> lk(application::main_event_mutex_);
		application::main_event_.wait(lk, [] { return application::interrupted_; });
	}

	static void signal_handler(int sig)
	{
		std::lock_guard<std::mutex> lk__(application::main_event_mutex_);
		switch (reinterpret_cast<std::sig_atomic_t>(sig)) {
		case SIGINT:
		case SIGTERM:
			application::interrupted_ = true;
			application::main_event_.notify_all();
			break;
		default:
			// ("unhandled process-signal")
			break;
		}
	}
};

} // namespace cxx_argp

// to be included once per application - just before main() - at global scope
#define CXX_ARGP_APPLICATION_BOILERPLATE                      \
	std::mutex cxx_argp::application::main_event_mutex_;        \
	std::condition_variable cxx_argp::application::main_event_; \
	bool cxx_argp::application::interrupted_ = false;

#endif
